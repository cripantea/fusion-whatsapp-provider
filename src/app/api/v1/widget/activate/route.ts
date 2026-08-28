import { NextRequest, NextResponse } from "next/server";

import { authenticateApp } from "@/lib/api-key-auth";
import { corsPreflight, withCors } from "@/lib/cors";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type ActivateBody = {
  customerId?: string;
};

export async function OPTIONS() {
  return corsPreflight();
}

export async function POST(request: NextRequest) {
  const app = await authenticateApp(request);
  if (!app) {
    return withCors(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
  }

  let body: ActivateBody;
  try {
    body = await request.json();
  } catch {
    return withCors(NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }));
  }

  const customerId = body.customerId;
  if (!customerId) {
    return withCors(
      NextResponse.json({ error: "Missing required field: customerId" }, { status: 400 })
    );
  }

  // "Attiva WhatsApp" crea (o riattiva, se era stata revocata) l'AppUser: è il prerequisito
  // per poter poi avviare l'Embedded Signup ("Connetti WhatsApp") nello stato SUBSCRIBED_UNCONNECTED.
  const appUser = await prisma.appUser.upsert({
    where: { appId_externalCustomerId: { appId: app.id, externalCustomerId: customerId } },
    update: { status: "ACTIVE" },
    create: { appId: app.id, externalCustomerId: customerId, status: "ACTIVE" },
  });

  return withCors(NextResponse.json({ status: "SUBSCRIBED_UNCONNECTED", appUserId: appUser.id }));
}
