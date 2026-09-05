import { NextRequest, NextResponse } from "next/server";

import { authenticateAppWithSecret } from "@/lib/api-key-auth";
import { decrypt } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import type { AppModel as App } from "@/generated/prisma/models";

export const runtime = "nodejs";

const GRAPH_API_VERSION = "v21.0";
const GRAPH_API_BASE_URL = process.env.GRAPH_API_BASE_URL ?? "https://graph.facebook.com";
const TEMPLATE_NAME_PATTERN = /^[a-z0-9_]+$/;
const MAX_QUICK_REPLY_BUTTONS = 3;

type MetaTemplateComponent = {
  type?: string;
  text?: string;
};

type MetaTemplate = {
  id?: string;
  name?: string;
  language?: string;
  category?: string;
  status?: string;
  components?: MetaTemplateComponent[];
};

/** Conta i placeholder posizionali `{{1}}`, `{{2}}`, ... nel body approvato da Meta. */
function countBodyVariables(body: string): number {
  const matches = body.match(/\{\{\d+\}\}/g);
  if (!matches) return 0;
  return new Set(matches).size;
}

function toTemplateSummary(template: MetaTemplate) {
  const bodyComponent = template.components?.find((c) => c.type === "BODY");
  const body = bodyComponent?.text ?? "";

  return {
    externalId: template.id ?? null,
    name: template.name ?? "",
    language: template.language ?? "",
    category: template.category ?? "UTILITY",
    status: template.status ?? "PENDING",
    body,
    variableCount: countBodyVariables(body),
  };
}

type ResolvedConnection = { wabaId: string; accessToken: string };
type ResolveResult = { ok: true; connection: ResolvedConnection } | { ok: false; response: NextResponse };

/**
 * L'access token di una connessione AppUser (Step 9, SDK) vive solo qui in
 * Fusion WA, mai lato integratore: sia la lettura che la creazione dei
 * template devono quindi passare da qui.
 */
async function resolveAppUserConnection(app: App, externalCustomerId: string): Promise<ResolveResult> {
  const appUser = await prisma.appUser.findUnique({
    where: { appId_externalCustomerId: { appId: app.id, externalCustomerId } },
    include: { whatsappConnection: true },
  });
  if (!appUser || appUser.status !== "ACTIVE") {
    return { ok: false, response: NextResponse.json({ error: "AppUser non attivo" }, { status: 403 }) };
  }

  const connection = appUser.whatsappConnection;
  if (!connection || connection.status !== "CONNECTED" || !connection.accessToken) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Nessun numero WhatsApp collegato per questo cliente" },
        { status: 409 }
      ),
    };
  }

  return { ok: true, connection: { wabaId: connection.wabaId, accessToken: decrypt(connection.accessToken) } };
}

export async function GET(request: NextRequest) {
  const app = await authenticateAppWithSecret(request);
  if (!app) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const externalCustomerId = request.nextUrl.searchParams.get("externalCustomerId");
  if (!externalCustomerId) {
    return NextResponse.json(
      { error: "Missing required query param: externalCustomerId" },
      { status: 400 }
    );
  }

  const resolved = await resolveAppUserConnection(app, externalCustomerId);
  if (!resolved.ok) return resolved.response;
  const { wabaId, accessToken } = resolved.connection;

  const templatesUrl = new URL(`${GRAPH_API_BASE_URL}/${GRAPH_API_VERSION}/${wabaId}/message_templates`);
  templatesUrl.searchParams.set("fields", "name,language,category,status,components");
  templatesUrl.searchParams.set("limit", "200");

  const graphResponse = await fetch(templatesUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const graphData = await graphResponse.json().catch(() => null);

  if (!graphResponse.ok) {
    return NextResponse.json(
      { error: "Recupero template fallito", details: graphData?.error ?? null },
      { status: 502 }
    );
  }

  const templates = ((graphData?.data as MetaTemplate[] | undefined) ?? []).map(toTemplateSummary);

  return NextResponse.json({ status: "success", templates });
}

type CreateTemplateBody = {
  externalCustomerId?: string;
  name?: string;
  language?: string;
  category?: string;
  headerText?: string;
  bodyText?: string;
  bodyExamples?: unknown;
  footerText?: string;
  buttons?: unknown;
};

/**
 * Crea un template e lo sottomette a revisione Meta. Copre solo il
 * sottoinsieme di componenti coperto dall'MVP: header solo testo (senza
 * variabili), body con variabili posizionali {{1}}, {{2}}, ... (ciascuna con
 * un valore di esempio, obbligatorio per Meta), footer opzionale, bottoni
 * quick-reply opzionali (max 3). Header media, bottoni URL/telefono/copy-code
 * e la categoria AUTHENTICATION restano fuori scope per ora.
 */
export async function POST(request: NextRequest) {
  const app = await authenticateAppWithSecret(request);
  if (!app) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: CreateTemplateBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    externalCustomerId,
    name,
    language,
    category,
    headerText,
    bodyText,
    bodyExamples,
    footerText,
    buttons,
  } = body;

  if (!externalCustomerId || !name || !language || !category || !bodyText) {
    return NextResponse.json(
      { error: "Missing required fields: externalCustomerId, name, language, category, bodyText" },
      { status: 400 }
    );
  }

  if (!TEMPLATE_NAME_PATTERN.test(name)) {
    return NextResponse.json(
      { error: "name deve contenere solo lettere minuscole, numeri e underscore" },
      { status: 400 }
    );
  }

  if (category !== "MARKETING" && category !== "UTILITY") {
    return NextResponse.json({ error: "category deve essere MARKETING o UTILITY" }, { status: 400 });
  }

  const examples = Array.isArray(bodyExamples) ? bodyExamples.map(String) : [];
  const variableCount = countBodyVariables(bodyText);
  if (examples.length !== variableCount) {
    return NextResponse.json(
      {
        error: `bodyText usa ${variableCount} variabili ma sono stati forniti ${examples.length} valori di esempio`,
      },
      { status: 400 }
    );
  }
  if (examples.some((value) => !value.trim())) {
    return NextResponse.json({ error: "Ogni variabile richiede un valore di esempio non vuoto" }, { status: 400 });
  }

  const buttonLabels = Array.isArray(buttons) ? buttons.map(String).filter((b) => b.trim()) : [];
  if (buttonLabels.length > MAX_QUICK_REPLY_BUTTONS) {
    return NextResponse.json(
      { error: `Massimo ${MAX_QUICK_REPLY_BUTTONS} bottoni quick-reply` },
      { status: 400 }
    );
  }

  const resolved = await resolveAppUserConnection(app, externalCustomerId);
  if (!resolved.ok) return resolved.response;
  const { wabaId, accessToken } = resolved.connection;

  const components: Record<string, unknown>[] = [];
  if (headerText?.trim()) {
    components.push({ type: "HEADER", format: "TEXT", text: headerText.trim() });
  }
  components.push({
    type: "BODY",
    text: bodyText,
    ...(examples.length > 0 ? { example: { body_text: [examples] } } : {}),
  });
  if (footerText?.trim()) {
    components.push({ type: "FOOTER", text: footerText.trim() });
  }
  if (buttonLabels.length > 0) {
    components.push({
      type: "BUTTONS",
      buttons: buttonLabels.map((label) => ({ type: "QUICK_REPLY", text: label })),
    });
  }

  const createUrl = `${GRAPH_API_BASE_URL}/${GRAPH_API_VERSION}/${wabaId}/message_templates`;
  const graphResponse = await fetch(createUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ name, language, category, components }),
  });
  const graphData = await graphResponse.json().catch(() => null);

  if (!graphResponse.ok) {
    return NextResponse.json(
      { error: "Creazione template rifiutata da Meta", details: graphData?.error ?? null },
      { status: 502 }
    );
  }

  return NextResponse.json({
    status: "success",
    template: {
      externalId: graphData?.id ?? null,
      name,
      language,
      category: graphData?.category ?? category,
      status: graphData?.status ?? "PENDING",
    },
  });
}
