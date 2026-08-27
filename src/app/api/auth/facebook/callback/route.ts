import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const GRAPH_API_VERSION = "v21.0";

type CallbackBody = {
  code?: string;
  wabaId?: string;
  phoneNumberId?: string;
  tenantId?: string;
};

export async function POST(request: NextRequest) {
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

  const existingTenant = tenantId
    ? await prisma.tenant.findUnique({ where: { id: tenantId } })
    : await prisma.tenant.findFirst({ orderBy: { createdAt: "asc" } });

  const tenant =
    existingTenant ?? (await prisma.tenant.create({ data: { name: "Default Workspace" } }));

  const connection = await prisma.whatsappConnection.upsert({
    where: { phoneNumberId },
    update: {
      wabaId,
      displayPhoneNumber,
      status: "CONNECTED",
      tenantId: tenant.id,
    },
    create: {
      tenantId: tenant.id,
      wabaId,
      phoneNumberId,
      displayPhoneNumber,
      status: "CONNECTED",
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
