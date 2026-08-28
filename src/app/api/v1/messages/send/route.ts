import { NextRequest, NextResponse } from "next/server";

import { authenticateAppWithSecret } from "@/lib/api-key-auth";
import { decrypt } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const GRAPH_API_VERSION = "v21.0";
const GRAPH_API_BASE_URL = process.env.GRAPH_API_BASE_URL ?? "https://graph.facebook.com";

type SendMessageBody = {
  externalCustomerId?: string;
  toPhoneNumber?: string;
  message?: string;
};

export async function POST(request: NextRequest) {
  const app = await authenticateAppWithSecret(request);
  if (!app) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: SendMessageBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { externalCustomerId, toPhoneNumber, message } = body;
  if (!externalCustomerId || !toPhoneNumber || !message) {
    return NextResponse.json(
      { error: "Missing required fields: externalCustomerId, toPhoneNumber, message" },
      { status: 400 }
    );
  }

  const appUser = await prisma.appUser.findUnique({
    where: { appId_externalCustomerId: { appId: app.id, externalCustomerId } },
    include: { whatsappConnection: true },
  });

  if (!appUser || appUser.status !== "ACTIVE") {
    return NextResponse.json({ error: "AppUser non attivo" }, { status: 403 });
  }

  const connection = appUser.whatsappConnection;
  if (!connection || connection.status !== "CONNECTED" || !connection.accessToken) {
    return NextResponse.json(
      { error: "Nessun numero WhatsApp collegato per questo cliente" },
      { status: 409 }
    );
  }

  const accessToken = decrypt(connection.accessToken);

  const messagesUrl = `${GRAPH_API_BASE_URL}/${GRAPH_API_VERSION}/${connection.phoneNumberId}/messages`;
  const graphResponse = await fetch(messagesUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: toPhoneNumber,
      type: "text",
      text: { preview_url: false, body: message },
    }),
  });

  const graphData = await graphResponse.json().catch(() => null);

  if (!graphResponse.ok) {
    return NextResponse.json(
      { error: "Invio del messaggio fallito", details: graphData?.error ?? null },
      { status: 502 }
    );
  }

  return NextResponse.json({
    status: "success",
    messageId: graphData?.messages?.[0]?.id ?? null,
  });
}
