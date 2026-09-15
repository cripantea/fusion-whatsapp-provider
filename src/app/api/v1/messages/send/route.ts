import { NextRequest, NextResponse } from "next/server";

import { authenticateAppWithSecret } from "@/lib/api-key-auth";
import { decrypt } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limiter";

export const runtime = "nodejs";

const GRAPH_API_VERSION = "v26.0";
const GRAPH_API_BASE_URL = process.env.GRAPH_API_BASE_URL ?? "https://graph.facebook.com";
// E.164: opzionale "+" iniziale, poi 7–15 cifre (ITU-T E.164 max 15 digits)
const PHONE_NUMBER_PATTERN = /^\+?[1-9]\d{6,14}$/;
const CUSTOMER_ID_MAX_LENGTH = 255;
const MESSAGE_MAX_LENGTH = 4096;

type TemplatePayload = {
  name?: string;
  language?: string;
  bodyParams?: unknown;
};

type SendMessageBody = {
  externalCustomerId?: string;
  toPhoneNumber?: string;
  message?: string;
  // Un template pre-approvato è l'unico modo per iniziare una conversazione con
  // un numero senza una finestra di 24h già aperta (regola della piattaforma
  // WhatsApp, non un limite nostro): se presente, ha priorità su `message`.
  template?: TemplatePayload;
};

export async function POST(request: NextRequest) {
  const app = await authenticateAppWithSecret(request);
  if (!app) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 60 messaggi/min per chiave API: 1/sec, sufficiente per use case reali
  const rl = await checkRateLimit(app.apiKey, "messages-send", 60, 60);
  if (!rl.allowed) return rateLimitResponse();

  let body: SendMessageBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { externalCustomerId, toPhoneNumber, message, template } = body;
  if (!externalCustomerId || !toPhoneNumber) {
    return NextResponse.json(
      { error: "Missing required fields: externalCustomerId, toPhoneNumber" },
      { status: 400 }
    );
  }
  if (typeof externalCustomerId !== "string" || externalCustomerId.length > CUSTOMER_ID_MAX_LENGTH) {
    return NextResponse.json(
      { error: `externalCustomerId deve essere una stringa di max ${CUSTOMER_ID_MAX_LENGTH} caratteri` },
      { status: 400 }
    );
  }
  if (typeof toPhoneNumber !== "string" || !PHONE_NUMBER_PATTERN.test(toPhoneNumber)) {
    return NextResponse.json(
      { error: "toPhoneNumber deve essere un numero in formato E.164 (es. +393331234567)" },
      { status: 400 }
    );
  }
  if (message && (typeof message !== "string" || message.length > MESSAGE_MAX_LENGTH)) {
    return NextResponse.json(
      { error: `message deve essere una stringa di max ${MESSAGE_MAX_LENGTH} caratteri` },
      { status: 400 }
    );
  }
  if (!message && !template) {
    return NextResponse.json(
      { error: "Serve uno tra: message (testo libero) o template (per contattare un numero nuovo)" },
      { status: 400 }
    );
  }
  if (template && (!template.name || !template.language || typeof template.name !== "string" || typeof template.language !== "string")) {
    return NextResponse.json(
      { error: "template richiede almeno { name, language }" },
      { status: 400 }
    );
  }
  if (template?.bodyParams !== undefined && !Array.isArray(template.bodyParams)) {
    return NextResponse.json({ error: "template.bodyParams deve essere un array" }, { status: 400 });
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

  if (connection.billingStatus === "PAYMENT_FAILED") {
    return NextResponse.json(
      { error: "Connessione non operativa: pagamento fallito — risolvere il billing dalla dashboard" },
      { status: 402 }
    );
  }

  const accessToken = decrypt(connection.accessToken);

  const messagesUrl = `${GRAPH_API_BASE_URL}/${GRAPH_API_VERSION}/${connection.phoneNumberId}/messages`;
  const graphPayload = template
    ? {
        messaging_product: "whatsapp",
        to: toPhoneNumber,
        type: "template",
        template: {
          name: template.name,
          language: { code: template.language },
          ...(Array.isArray(template.bodyParams) && template.bodyParams.length > 0
            ? {
                components: [
                  {
                    type: "body",
                    parameters: template.bodyParams.map((param) => ({
                      type: "text",
                      text: String(param),
                    })),
                  },
                ],
              }
            : {}),
        },
      }
    : {
        messaging_product: "whatsapp",
        to: toPhoneNumber,
        type: "text",
        text: { preview_url: false, body: message },
      };

  const graphResponse = await fetch(messagesUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(graphPayload),
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
