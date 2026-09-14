import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { API_KEY_HEADER, authenticateApp } from "@/lib/api-key-auth";
import { assertTenantOwnedByAgency } from "@/lib/active-tenant";
import { chargeConnectionActivation } from "@/lib/connection-billing";
import { authorizeNewConnection } from "@/lib/connection-authorization";
import { corsPreflight, withCors } from "@/lib/cors";
import { encrypt } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const GRAPH_API_VERSION = "v26.0";
// Configurabile per test/endpoint regionali; di default punta alla Graph API pubblica di Meta.
const GRAPH_API_BASE_URL = process.env.GRAPH_API_BASE_URL ?? "https://graph.facebook.com";

type CallbackBody = {
  code?: string;
  wabaId?: string;
  // Presente per la registrazione standard (evento FINISH). Assente per la
  // Coexistence (evento FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING, che porta
  // solo waba_id) — in quel caso va risolto qui, vedi resolvePhoneNumberId.
  phoneNumberId?: string;
  // Contesto dashboard (Step 5): collega la connessione a un Tenant, richiede sessione utente.
  tenantId?: string;
  // Contesto SDK per software house terze (Step 9): collega la connessione a un AppUser,
  // autenticato via apiKey (nessuna sessione dashboard: il widget gira su un sito esterno).
  externalCustomerId?: string;
};

type GraphOAuthResult = { accessToken: string; tokenExpiresAt: Date | null };

async function exchangeCodeForToken(code: string): Promise<GraphOAuthResult | null> {
  const appId = process.env.FACEBOOK_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET;
  if (!appId || !appSecret) return null;

  const tokenUrl = new URL(`${GRAPH_API_BASE_URL}/${GRAPH_API_VERSION}/oauth/access_token`);
  tokenUrl.searchParams.set("client_id", appId);
  tokenUrl.searchParams.set("client_secret", appSecret);
  tokenUrl.searchParams.set("code", code);

  const tokenResponse = await fetch(tokenUrl, { method: "GET" });
  const tokenData = await tokenResponse.json();

  if (!tokenResponse.ok || typeof tokenData.access_token !== "string") {
    return null;
  }

  const expiresInSeconds: number | undefined =
    typeof tokenData.expires_in === "number" ? tokenData.expires_in : undefined;

  return {
    accessToken: tokenData.access_token,
    tokenExpiresAt: expiresInSeconds ? new Date(Date.now() + expiresInSeconds * 1000) : null,
  };
}

async function subscribeWabaWebhook(wabaId: string, accessToken: string): Promise<boolean> {
  // Sottoscrizione webhook obbligatoria: senza questa chiamata Meta non invierà
  // MAI gli eventi di questa WABA al nostro webhook.
  const subscribeUrl = new URL(`${GRAPH_API_BASE_URL}/${GRAPH_API_VERSION}/${wabaId}/subscribed_apps`);
  subscribeUrl.searchParams.set("access_token", accessToken);

  const subscribeResponse = await fetch(subscribeUrl, { method: "POST" });
  const subscribeData = await subscribeResponse.json().catch(() => null);

  return subscribeResponse.ok && subscribeData?.success === true;
}

async function fetchDisplayPhoneNumber(phoneNumberId: string, accessToken: string): Promise<string> {
  try {
    const phoneUrl = new URL(`${GRAPH_API_BASE_URL}/${GRAPH_API_VERSION}/${phoneNumberId}`);
    phoneUrl.searchParams.set("fields", "display_phone_number");
    phoneUrl.searchParams.set("access_token", accessToken);

    const phoneResponse = await fetch(phoneUrl);
    if (phoneResponse.ok) {
      const phoneData = await phoneResponse.json();
      if (typeof phoneData.display_phone_number === "string") {
        return phoneData.display_phone_number;
      }
    }
  } catch {
    // Il numero visualizzato è un dato accessorio: se la chiamata fallisce
    // si prosegue comunque salvando la connessione con phoneNumberId come fallback.
  }
  return phoneNumberId;
}

async function fetchPhoneNumbersForWaba(
  wabaId: string,
  accessToken: string
): Promise<Array<{ id: string; isOnBizApp: boolean }>> {
  const url = new URL(`${GRAPH_API_BASE_URL}/${GRAPH_API_VERSION}/${wabaId}/phone_numbers`);
  url.searchParams.set("fields", "is_on_biz_app");
  url.searchParams.set("access_token", accessToken);

  const response = await fetch(url);
  const data = await response.json().catch(() => null);
  if (!response.ok || !Array.isArray(data?.data)) {
    return [];
  }

  return (data.data as Array<{ id?: string; is_on_biz_app?: boolean }>)
    .filter((entry): entry is { id: string; is_on_biz_app?: boolean } => typeof entry.id === "string")
    .map((entry) => ({ id: entry.id, isOnBizApp: entry.is_on_biz_app === true }));
}

/**
 * La registrazione standard (evento FINISH) porta già phone_number_id dal
 * client. La Coexistence (evento FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING)
 * porta solo waba_id: il numero va risolto qui elencando i numeri della WABA
 * e prendendo quello effettivamente collegato all'app WhatsApp Business
 * (is_on_biz_app), o il primo disponibile se nessuno lo è ancora.
 */
async function resolvePhoneNumberId(
  wabaId: string,
  accessToken: string,
  providedPhoneNumberId: string | undefined
): Promise<string | null> {
  if (providedPhoneNumberId) return providedPhoneNumberId;

  const phoneNumbers = await fetchPhoneNumbersForWaba(wabaId, accessToken);
  const onBizApp = phoneNumbers.find((entry) => entry.isOnBizApp);
  return onBizApp?.id ?? phoneNumbers[0]?.id ?? null;
}

export async function OPTIONS() {
  return corsPreflight();
}

export async function POST(request: NextRequest) {
  let body: CallbackBody;
  try {
    body = await request.json();
  } catch {
    return withCors(NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }));
  }

  const { code, wabaId, phoneNumberId, tenantId, externalCustomerId } = body;

  if (!code || !wabaId) {
    return withCors(
      NextResponse.json({ error: "Missing required fields: code, wabaId" }, { status: 400 })
    );
  }

  if (externalCustomerId) {
    return withCors(
      await handleAppUserContext(request, { code, wabaId, phoneNumberId, externalCustomerId })
    );
  }

  if (tenantId) {
    return withCors(await handleTenantContext({ code, wabaId, phoneNumberId, tenantId }));
  }

  return withCors(
    NextResponse.json(
      { error: "Missing required context: tenantId oppure externalCustomerId" },
      { status: 400 }
    )
  );
}

async function handleTenantContext(params: {
  code: string;
  wabaId: string;
  phoneNumberId?: string;
  tenantId: string;
}): Promise<NextResponse> {
  const { code, wabaId, phoneNumberId: providedPhoneNumberId, tenantId } = params;

  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Il workspace di destinazione deve appartenere all'agency dell'utente loggato:
  // impedisce di assegnare una WABA a un tenant di un'altra agency.
  const targetTenant = await assertTenantOwnedByAgency(tenantId, session.user.agencyId);
  if (!targetTenant) {
    return NextResponse.json({ error: "Workspace di destinazione non valido" }, { status: 403 });
  }

  const oauthResult = await exchangeCodeForToken(code);
  if (!oauthResult) {
    return NextResponse.json({ error: "Failed to exchange code for access token" }, { status: 502 });
  }

  const phoneNumberId = await resolvePhoneNumberId(wabaId, oauthResult.accessToken, providedPhoneNumberId);
  if (!phoneNumberId) {
    return NextResponse.json(
      { error: "Impossibile determinare il numero di telefono collegato a questa WABA" },
      { status: 502 }
    );
  }

  // Ownership check: se questo numero è già collegato a un altro tenant/appUser, blocca
  // l'operazione invece di "rubare" silenziosamente la connessione.
  const existingConnection = await prisma.whatsappConnection.findUnique({ where: { phoneNumberId } });
  if (existingConnection && existingConnection.tenantId !== targetTenant.id) {
    return NextResponse.json({ error: "Connessione già registrata da un altro account" }, { status: 403 });
  }

  // Blocca il re-onboarding di una connessione con pagamento fallito:
  // il billing va risolto dalla dashboard, non ri-eseguendo il flusso Meta.
  if (existingConnection?.billingStatus === "PAYMENT_FAILED") {
    return NextResponse.json({ error: "Payment required", reason: "PAYMENT_FAILED" }, { status: 402 });
  }

  let connectionBillingStatus: 'NOT_REQUIRED' | 'PENDING' = 'NOT_REQUIRED';
  if (!existingConnection) {
    const authResult = await authorizeNewConnection({ agencyId: session.user.agencyId, context: 'dashboard' });
    if (!authResult.allowed) {
      return NextResponse.json({ error: 'Limit reached', reason: authResult.reason }, { status: 403 });
    }
    connectionBillingStatus = authResult.isFree ? 'NOT_REQUIRED' : 'PENDING';
  }

  const subscribed = await subscribeWabaWebhook(wabaId, oauthResult.accessToken);
  if (!subscribed) {
    return NextResponse.json({ error: "Impossibile sottoscrivere gli eventi webhook per questa WABA" }, { status: 502 });
  }

  const displayPhoneNumber = await fetchDisplayPhoneNumber(phoneNumberId, oauthResult.accessToken);
  const encryptedAccessToken = encrypt(oauthResult.accessToken);

  // Connessioni paganti iniziano in PENDING e vengono portate a CONNECTED solo dopo
  // il pagamento riuscito. Le connessioni gratuite (prima) diventano CONNECTED subito.
  const initialStatus = connectionBillingStatus === 'PENDING' ? 'PENDING' : 'CONNECTED';

  const connection = await prisma.whatsappConnection.upsert({
    where: { phoneNumberId },
    update: {
      wabaId,
      displayPhoneNumber,
      // Re-autorizzazione di connessione esistente: ripristina CONNECTED (token refresh)
      status: "CONNECTED",
      tenantId: targetTenant.id,
      appUserId: null,
      accessToken: encryptedAccessToken,
      tokenExpiresAt: oauthResult.tokenExpiresAt,
      lastHeartbeatAt: new Date(),
    },
    create: {
      tenantId: targetTenant.id,
      wabaId,
      phoneNumberId,
      displayPhoneNumber,
      status: initialStatus,
      billingStatus: connectionBillingStatus,
      accessToken: encryptedAccessToken,
      tokenExpiresAt: oauthResult.tokenExpiresAt,
      lastHeartbeatAt: new Date(),
    },
  });

  // Addebito immediato per connessioni paganti
  if (!existingConnection && connectionBillingStatus === 'PENDING') {
    const chargeResult = await chargeConnectionActivation({
      connectionId: connection.id,
      agencyId: session.user.agencyId,
    });

    if (!chargeResult.success && chargeResult.requiresAction) {
      return NextResponse.json({
        status: "payment_pending",
        requiresAction: true,
        reason: "REQUIRES_ACTION",
        connection: { id: connection.id, status: "PENDING", billingStatus: "PENDING" },
      }, { status: 202 });
    }

    if (!chargeResult.success) {
      return NextResponse.json({
        status: "payment_failed",
        error: "Pagamento non riuscito",
        reason: "PAYMENT_FAILED",
        connection: { id: connection.id, status: "PENDING", billingStatus: "PAYMENT_FAILED" },
      }, { status: 402 });
    }

    // Payment succeeded — reload final state from DB (set by chargeConnectionActivation)
    const paid = await prisma.whatsappConnection.findUniqueOrThrow({ where: { id: connection.id } });
    return NextResponse.json({
      status: "success",
      connection: {
        id: paid.id,
        wabaId: paid.wabaId,
        phoneNumberId: paid.phoneNumberId,
        displayPhoneNumber: paid.displayPhoneNumber,
        status: paid.status,
        billingStatus: paid.billingStatus,
      },
    });
  }

  return NextResponse.json({
    status: "success",
    connection: {
      id: connection.id,
      wabaId: connection.wabaId,
      phoneNumberId: connection.phoneNumberId,
      displayPhoneNumber: connection.displayPhoneNumber,
      status: connection.status,
      billingStatus: connection.billingStatus,
    },
  });
}

async function handleAppUserContext(
  request: NextRequest,
  params: { code: string; wabaId: string; phoneNumberId?: string; externalCustomerId: string }
): Promise<NextResponse> {
  const { code, wabaId, phoneNumberId: providedPhoneNumberId, externalCustomerId } = params;

  const app = await authenticateApp(request);
  if (!app) {
    return NextResponse.json(
      { error: `Unauthorized: header ${API_KEY_HEADER} mancante o non valido` },
      { status: 401 }
    );
  }

  const appUser = await prisma.appUser.findUnique({
    where: { appId_externalCustomerId: { appId: app.id, externalCustomerId } },
  });
  if (!appUser || appUser.status !== "ACTIVE") {
    return NextResponse.json({ error: "AppUser non attivo: chiamare prima /api/v1/widget/activate" }, { status: 403 });
  }

  const oauthResult = await exchangeCodeForToken(code);
  if (!oauthResult) {
    return NextResponse.json({ error: "Failed to exchange code for access token" }, { status: 502 });
  }

  const phoneNumberId = await resolvePhoneNumberId(wabaId, oauthResult.accessToken, providedPhoneNumberId);
  if (!phoneNumberId) {
    return NextResponse.json(
      { error: "Impossibile determinare il numero di telefono collegato a questa WABA" },
      { status: 502 }
    );
  }

  const existingConnection = await prisma.whatsappConnection.findUnique({ where: { phoneNumberId } });
  if (existingConnection && existingConnection.appUserId !== appUser.id) {
    return NextResponse.json({ error: "Connessione già registrata da un altro account" }, { status: 403 });
  }

  if (existingConnection?.billingStatus === "PAYMENT_FAILED") {
    return NextResponse.json({ error: "Payment required", reason: "PAYMENT_FAILED" }, { status: 402 });
  }

  let connectionBillingStatus: 'NOT_REQUIRED' | 'PENDING' = 'NOT_REQUIRED';
  if (!existingConnection) {
    const authResult = await authorizeNewConnection({ agencyId: app.agencyId, appId: app.id, context: 'sdk' });
    if (!authResult.allowed) {
      return NextResponse.json({ error: 'Limit reached', reason: authResult.reason }, { status: 403 });
    }
    connectionBillingStatus = authResult.isFree ? 'NOT_REQUIRED' : 'PENDING';
  }

  const subscribed = await subscribeWabaWebhook(wabaId, oauthResult.accessToken);
  if (!subscribed) {
    return NextResponse.json({ error: "Impossibile sottoscrivere gli eventi webhook per questa WABA" }, { status: 502 });
  }

  const displayPhoneNumber = await fetchDisplayPhoneNumber(phoneNumberId, oauthResult.accessToken);
  const encryptedAccessToken = encrypt(oauthResult.accessToken);

  const initialStatus = connectionBillingStatus === 'PENDING' ? 'PENDING' : 'CONNECTED';

  const connection = await prisma.whatsappConnection.upsert({
    where: { phoneNumberId },
    update: {
      wabaId,
      displayPhoneNumber,
      status: "CONNECTED",
      appUserId: appUser.id,
      tenantId: null,
      // Le connessioni AppUser non hanno un endpoint proprio per impostare
      // target_webhook_url (a differenza del flusso Tenant): ereditano sempre
      // il default configurato sull'App, così restano allineate se cambia.
      targetWebhookUrl: app.webhookUrl,
      accessToken: encryptedAccessToken,
      tokenExpiresAt: oauthResult.tokenExpiresAt,
      lastHeartbeatAt: new Date(),
    },
    create: {
      appUserId: appUser.id,
      wabaId,
      phoneNumberId,
      displayPhoneNumber,
      status: initialStatus,
      billingStatus: connectionBillingStatus,
      targetWebhookUrl: app.webhookUrl,
      accessToken: encryptedAccessToken,
      tokenExpiresAt: oauthResult.tokenExpiresAt,
      lastHeartbeatAt: new Date(),
    },
  });

  if (!existingConnection && connectionBillingStatus === 'PENDING') {
    const chargeResult = await chargeConnectionActivation({
      connectionId: connection.id,
      agencyId: app.agencyId,
    });

    if (!chargeResult.success && chargeResult.requiresAction) {
      return NextResponse.json({
        status: "payment_pending",
        requiresAction: true,
        reason: "REQUIRES_ACTION",
        connection: { id: connection.id, status: "PENDING", billingStatus: "PENDING" },
      }, { status: 202 });
    }

    if (!chargeResult.success) {
      return NextResponse.json({
        status: "payment_failed",
        error: "Pagamento non riuscito",
        reason: "PAYMENT_FAILED",
        connection: { id: connection.id, status: "PENDING", billingStatus: "PAYMENT_FAILED" },
      }, { status: 402 });
    }

    const paid = await prisma.whatsappConnection.findUniqueOrThrow({ where: { id: connection.id } });
    return NextResponse.json({
      status: "success",
      connection: {
        id: paid.id,
        wabaId: paid.wabaId,
        phoneNumberId: paid.phoneNumberId,
        displayPhoneNumber: paid.displayPhoneNumber,
        status: paid.status,
        billingStatus: paid.billingStatus,
      },
    });
  }

  return NextResponse.json({
    status: "success",
    connection: {
      id: connection.id,
      wabaId: connection.wabaId,
      phoneNumberId: connection.phoneNumberId,
      displayPhoneNumber: connection.displayPhoneNumber,
      status: connection.status,
      billingStatus: connection.billingStatus,
    },
  });
}
