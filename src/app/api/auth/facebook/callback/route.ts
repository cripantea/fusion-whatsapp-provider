import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { assertTenantOwnedByAgency } from "@/lib/active-tenant";
import { encrypt } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const GRAPH_API_VERSION = "v21.0";
// Configurabile per test/endpoint regionali; di default punta alla Graph API pubblica di Meta.
const GRAPH_API_BASE_URL = process.env.GRAPH_API_BASE_URL ?? "https://graph.facebook.com";

type CallbackBody = {
  code?: string;
  wabaId?: string;
  phoneNumberId?: string;
  tenantId?: string;
};

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const appId = process.env.FACEBOOK_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET;

  if (!appId || !appSecret) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  let body: CallbackBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { code, wabaId, phoneNumberId, tenantId } = body;

  if (!code || !wabaId || !phoneNumberId || !tenantId) {
    return NextResponse.json(
      { error: "Missing required fields: code, wabaId, phoneNumberId, tenantId" },
      { status: 400 }
    );
  }

  // Il workspace di destinazione deve appartenere all'agency dell'utente loggato:
  // impedisce di assegnare una WABA a un tenant di un'altra agency.
  const targetTenant = await assertTenantOwnedByAgency(tenantId, session.user.agencyId);
  if (!targetTenant) {
    return NextResponse.json(
      { error: "Workspace di destinazione non valido" },
      { status: 403 }
    );
  }

  // Ownership check: se questo numero è già collegato a un altro tenant, blocca
  // l'operazione invece di "rubare" silenziosamente la connessione.
  const existingConnection = await prisma.whatsappConnection.findUnique({
    where: { phoneNumberId },
  });
  if (existingConnection && existingConnection.tenantId !== targetTenant.id) {
    return NextResponse.json(
      { error: "Connessione già registrata da un altro account" },
      { status: 403 }
    );
  }

  const tokenUrl = new URL(
    `${GRAPH_API_BASE_URL}/${GRAPH_API_VERSION}/oauth/access_token`
  );
  tokenUrl.searchParams.set("client_id", appId);
  tokenUrl.searchParams.set("client_secret", appSecret);
  tokenUrl.searchParams.set("code", code);

  const tokenResponse = await fetch(tokenUrl, { method: "GET" });
  const tokenData = await tokenResponse.json();

  if (!tokenResponse.ok || typeof tokenData.access_token !== "string") {
    return NextResponse.json(
      { error: "Failed to exchange code for access token" },
      { status: 502 }
    );
  }

  const accessToken: string = tokenData.access_token;
  const expiresInSeconds: number | undefined =
    typeof tokenData.expires_in === "number" ? tokenData.expires_in : undefined;
  const tokenExpiresAt = expiresInSeconds
    ? new Date(Date.now() + expiresInSeconds * 1000)
    : null;

  // Sottoscrizione webhook obbligatoria: senza questa chiamata Meta non invierà
  // MAI gli eventi di questa WABA al nostro webhook. Se fallisce, non salviamo nulla.
  const subscribeUrl = new URL(
    `${GRAPH_API_BASE_URL}/${GRAPH_API_VERSION}/${wabaId}/subscribed_apps`
  );
  subscribeUrl.searchParams.set("access_token", accessToken);

  const subscribeResponse = await fetch(subscribeUrl, { method: "POST" });
  const subscribeData = await subscribeResponse.json().catch(() => null);

  if (!subscribeResponse.ok || subscribeData?.success !== true) {
    return NextResponse.json(
      { error: "Impossibile sottoscrivere gli eventi webhook per questa WABA" },
      { status: 502 }
    );
  }

  let displayPhoneNumber = phoneNumberId;
  try {
    const phoneUrl = new URL(
      `${GRAPH_API_BASE_URL}/${GRAPH_API_VERSION}/${phoneNumberId}`
    );
    phoneUrl.searchParams.set("fields", "display_phone_number");
    phoneUrl.searchParams.set("access_token", accessToken);

    const phoneResponse = await fetch(phoneUrl);
    if (phoneResponse.ok) {
      const phoneData = await phoneResponse.json();
      if (typeof phoneData.display_phone_number === "string") {
        displayPhoneNumber = phoneData.display_phone_number;
      }
    }
  } catch {
    // Il numero visualizzato è un dato accessorio: se la chiamata fallisce
    // si prosegue comunque salvando la connessione con phoneNumberId come fallback.
  }

  const encryptedAccessToken = encrypt(accessToken);

  const connection = await prisma.whatsappConnection.upsert({
    where: { phoneNumberId },
    update: {
      wabaId,
      displayPhoneNumber,
      status: "CONNECTED",
      tenantId: targetTenant.id,
      accessToken: encryptedAccessToken,
      tokenExpiresAt,
      lastHeartbeatAt: new Date(),
    },
    create: {
      tenantId: targetTenant.id,
      wabaId,
      phoneNumberId,
      displayPhoneNumber,
      status: "CONNECTED",
      accessToken: encryptedAccessToken,
      tokenExpiresAt,
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
