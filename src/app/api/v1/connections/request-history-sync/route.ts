import { NextRequest, NextResponse } from "next/server";

import { authenticateAppWithSecret } from "@/lib/api-key-auth";
import { decrypt } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limiter";

export const runtime = "nodejs";

const GRAPH_API_VERSION = "v21.0";
const GRAPH_API_BASE_URL = process.env.GRAPH_API_BASE_URL ?? "https://graph.facebook.com";

// Codice restituito da Meta quando il business rifiuta la condivisione di
// contatti/storico: il numero resta comunque operativo per i messaggi live,
// solo lo storico non è disponibile — non è un errore da trattare come fallimento.
const REJECTED_ERROR_CODE = "2593109";

type RequestHistorySyncBody = {
  externalCustomerId?: string;
  syncType?: "history" | "smb_app_state_sync";
  phase?: number;
};

const CUSTOMER_ID_MAX_LENGTH = 255;

export async function POST(request: NextRequest) {
  const app = await authenticateAppWithSecret(request);
  if (!app) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 20 sync request/min per chiave API
  const rl = await checkRateLimit(app.apiKey, "history-sync", 20, 60);
  if (!rl.allowed) return rateLimitResponse();

  let body: RequestHistorySyncBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { externalCustomerId, syncType, phase } = body;
  if (!externalCustomerId || (syncType !== "history" && syncType !== "smb_app_state_sync")) {
    return NextResponse.json(
      { error: "Missing/invalid fields: externalCustomerId, syncType ('history' | 'smb_app_state_sync')" },
      { status: 400 }
    );
  }
  if (typeof externalCustomerId !== "string" || externalCustomerId.length > CUSTOMER_ID_MAX_LENGTH) {
    return NextResponse.json(
      { error: `externalCustomerId deve essere una stringa di max ${CUSTOMER_ID_MAX_LENGTH} caratteri` },
      { status: 400 }
    );
  }
  if (phase !== undefined && (!Number.isInteger(phase) || phase < 0 || phase > 10)) {
    return NextResponse.json(
      { error: "phase deve essere un intero tra 0 e 10" },
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

  const syncUrl = `${GRAPH_API_BASE_URL}/${GRAPH_API_VERSION}/${connection.phoneNumberId}/smb_app_data`;
  const graphResponse = await fetch(syncUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      sync_type: syncType,
      ...(phase !== undefined ? { phase } : {}),
    }),
  });

  const graphData = await graphResponse.json().catch(() => null);
  const errorCode = graphData?.error?.code ? String(graphData.error.code) : null;

  // Forma della risposta identica a quella di Graph API (error.code/error.message)
  // così un chiamante che già parla con Graph direttamente (es. sinistripro) non
  // deve cambiare la propria logica di lettura, solo l'URL a cui fa la richiesta.
  if (errorCode === REJECTED_ERROR_CODE) {
    return NextResponse.json({
      status: "rejected",
      error: { code: errorCode, message: graphData?.error?.message ?? null },
    });
  }

  if (!graphResponse.ok) {
    return NextResponse.json(
      { error: { code: errorCode, message: graphData?.error?.message ?? "Richiesta di sync fallita" } },
      { status: 502 }
    );
  }

  return NextResponse.json({ status: "requested" });
}
