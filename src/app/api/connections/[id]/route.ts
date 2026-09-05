import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { assertTenantOwnedByAgency } from "@/lib/active-tenant";
import { prisma } from "@/lib/prisma";
import { normalizeWebhookUrl } from "@/lib/webhook-url";

export const runtime = "nodejs";

type PatchBody = {
  targetWebhookUrl?: unknown;
};

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let body: PatchBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const normalized = normalizeWebhookUrl(body.targetWebhookUrl);
  if (!normalized.ok) {
    return NextResponse.json(
      { error: "targetWebhookUrl deve essere un URL http/https valido oppure vuoto" },
      { status: 400 }
    );
  }

  const connection = await prisma.whatsappConnection.findUnique({ where: { id } });
  if (!connection) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Le connessioni create via SDK (Step 9) appartengono a un AppUser, non a un Tenant:
  // non sono gestibili da questo endpoint, pensato solo per il flusso dashboard.
  if (!connection.tenantId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Verifica che il tenant della connessione appartenga all'agency dell'utente loggato.
  const ownedTenant = await assertTenantOwnedByAgency(
    connection.tenantId,
    session.user.agencyId
  );
  if (!ownedTenant) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updated = await prisma.whatsappConnection.update({
    where: { id },
    data: { targetWebhookUrl: normalized.url },
  });

  return NextResponse.json({
    status: "success",
    connection: {
      id: updated.id,
      targetWebhookUrl: updated.targetWebhookUrl,
    },
  });
}
