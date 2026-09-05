import { NextRequest, NextResponse } from "next/server";

import { authenticateAppWithSecret } from "@/lib/api-key-auth";
import { decrypt } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const GRAPH_API_VERSION = "v21.0";
const GRAPH_API_BASE_URL = process.env.GRAPH_API_BASE_URL ?? "https://graph.facebook.com";

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

/**
 * Espone i template approvati da Meta per il numero collegato di un AppUser
 * (Step 9, SDK): l'access token vive solo qui in Fusion WA, mai lato
 * integratore, quindi la sincronizzazione template va fatta passare da qui.
 */
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
  const templatesUrl = new URL(
    `${GRAPH_API_BASE_URL}/${GRAPH_API_VERSION}/${connection.wabaId}/message_templates`
  );
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
