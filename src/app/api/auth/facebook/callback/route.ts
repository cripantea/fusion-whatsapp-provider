import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { API_KEY_HEADER, authenticateApp } from "@/lib/api-key-auth";
import { assertTenantOwnedByAgency } from "@/lib/active-tenant";
import { countAgencyConnections } from "@/lib/agency-connections";
import { corsPreflight, withCors } from "@/lib/cors";
import { encrypt } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import { agencyHasSuperAdminUser } from "@/lib/superadmin";

export const runtime = "nodejs";

const GRAPH_API_VERSION = "v21.0";
// Configurabile per test/endpoint regionali; di default punta alla Graph API pubblica di Meta.
const GRAPH_API_BASE_URL = process.env.GRAPH_API_BASE_URL ?? "https://graph.facebook.com";

type CallbackBody = {
  code?: string;
  wabaId?: string;
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

  if (!code || !wabaId || !phoneNumberId) {
    return withCors(
      NextResponse.json(
        { error: "Missing required fields: code, wabaId, phoneNumberId" },
        { status: 400 }
      )
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
  phoneNumberId: string;
  tenantId: string;
}): Promise<NextResponse> {
  const { code, wabaId, phoneNumberId, tenantId } = params;

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

  // Ownership check: se questo numero è già collegato a un altro tenant/appUser, blocca
  // l'operazione invece di "rubare" silenziosamente la connessione.
  const existingConnection = await prisma.whatsappConnection.findUnique({ where: { phoneNumberId } });
  if (existingConnection && existingConnection.tenantId !== targetTenant.id) {
    return NextResponse.json({ error: "Connessione già registrata da un altro account" }, { status: 403 });
  }

  // Limite piano: una nuova connessione (non una riautorizzazione di una già esistente)
  // non può superare il numero massimo consentito dal piano dell'agency, a meno che
  // l'agency non sia quella di un superadmin (licenze illimitate).
  if (!existingConnection && !(await agencyHasSuperAdminUser(session.user.agencyId))) {
    const agency = await prisma.agency.findUnique({
      where: { id: session.user.agencyId },
      select: { maxConnections: true },
    });
    const currentConnections = await countAgencyConnections(session.user.agencyId);

    if (agency && currentConnections >= agency.maxConnections) {
      return NextResponse.json({ error: "Limit reached", maxConnections: agency.maxConnections }, { status: 403 });
    }
  }

  const oauthResult = await exchangeCodeForToken(code);
  if (!oauthResult) {
    return NextResponse.json({ error: "Failed to exchange code for access token" }, { status: 502 });
  }

  const subscribed = await subscribeWabaWebhook(wabaId, oauthResult.accessToken);
  if (!subscribed) {
    return NextResponse.json({ error: "Impossibile sottoscrivere gli eventi webhook per questa WABA" }, { status: 502 });
  }

  const displayPhoneNumber = await fetchDisplayPhoneNumber(phoneNumberId, oauthResult.accessToken);
  const encryptedAccessToken = encrypt(oauthResult.accessToken);

  const connection = await prisma.whatsappConnection.upsert({
    where: { phoneNumberId },
    update: {
      wabaId,
      displayPhoneNumber,
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
      status: "CONNECTED",
      accessToken: encryptedAccessToken,
      tokenExpiresAt: oauthResult.tokenExpiresAt,
      lastHeartbeatAt: new Date(),
    },
  });

  return NextResponse.json({
    status: "success",
    connection: {
      id: connection.id,
      wabaId: connection.wabaId,
      phoneNumberId: connection.phoneNumberId,
      displayPhoneNumber: connection.displayPhoneNumber,
      status: connection.status,
    },
  });
}

async function handleAppUserContext(
  request: NextRequest,
  params: { code: string; wabaId: string; phoneNumberId: string; externalCustomerId: string }
): Promise<NextResponse> {
  const { code, wabaId, phoneNumberId, externalCustomerId } = params;

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

  const existingConnection = await prisma.whatsappConnection.findUnique({ where: { phoneNumberId } });
  if (existingConnection && existingConnection.appUserId !== appUser.id) {
    return NextResponse.json({ error: "Connessione già registrata da un altro account" }, { status: 403 });
  }

  if (!existingConnection && !(await agencyHasSuperAdminUser(app.agencyId))) {
    const agency = await prisma.agency.findUnique({
      where: { id: app.agencyId },
      select: { maxConnections: true },
    });
    const currentConnections = await countAgencyConnections(app.agencyId);

    if (agency && currentConnections >= agency.maxConnections) {
      return NextResponse.json({ error: "Limit reached", maxConnections: agency.maxConnections }, { status: 403 });
    }
  }

  const oauthResult = await exchangeCodeForToken(code);
  if (!oauthResult) {
    return NextResponse.json({ error: "Failed to exchange code for access token" }, { status: 502 });
  }

  const subscribed = await subscribeWabaWebhook(wabaId, oauthResult.accessToken);
  if (!subscribed) {
    return NextResponse.json({ error: "Impossibile sottoscrivere gli eventi webhook per questa WABA" }, { status: 502 });
  }

  const displayPhoneNumber = await fetchDisplayPhoneNumber(phoneNumberId, oauthResult.accessToken);
  const encryptedAccessToken = encrypt(oauthResult.accessToken);

  const connection = await prisma.whatsappConnection.upsert({
    where: { phoneNumberId },
    update: {
      wabaId,
      displayPhoneNumber,
      status: "CONNECTED",
      appUserId: appUser.id,
      tenantId: null,
      accessToken: encryptedAccessToken,
      tokenExpiresAt: oauthResult.tokenExpiresAt,
      lastHeartbeatAt: new Date(),
    },
    create: {
      appUserId: appUser.id,
      wabaId,
      phoneNumberId,
      displayPhoneNumber,
      status: "CONNECTED",
      accessToken: encryptedAccessToken,
      tokenExpiresAt: oauthResult.tokenExpiresAt,
      lastHeartbeatAt: new Date(),
    },
  });

  return NextResponse.json({
    status: "success",
    connection: {
      id: connection.id,
      wabaId: connection.wabaId,
      phoneNumberId: connection.phoneNumberId,
      displayPhoneNumber: connection.displayPhoneNumber,
      status: connection.status,
    },
  });
}
