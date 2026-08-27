import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { encrypt } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const GRAPH_API_VERSION = "v21.0";

type CallbackBody = {
  code?: string;
  wabaId?: string;
  phoneNumberId?: string;
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

  const { code, wabaId, phoneNumberId } = body;

  if (!code || !wabaId || !phoneNumberId) {
    return NextResponse.json(
      { error: "Missing required fields: code, wabaId, phoneNumberId" },
      { status: 400 }
    );
  }

  const tokenUrl = new URL(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/oauth/access_token`
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

  let displayPhoneNumber = phoneNumberId;
  try {
    const phoneUrl = new URL(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}`
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
      tenantId: session.user.tenantId,
      accessToken: encryptedAccessToken,
      tokenExpiresAt,
      lastHeartbeatAt: new Date(),
    },
    create: {
      tenantId: session.user.tenantId,
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
