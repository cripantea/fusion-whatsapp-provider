import { NextRequest, NextResponse } from "next/server";

import { authenticateApp } from "@/lib/api-key-auth";
import { corsPreflight, withCors } from "@/lib/cors";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function OPTIONS() {
  return corsPreflight();
}

export async function GET(request: NextRequest) {
  const app = await authenticateApp(request);
  if (!app) {
    return withCors(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
  }

  const customerId = request.nextUrl.searchParams.get("customerId");
  if (!customerId) {
    return withCors(
      NextResponse.json({ error: "Missing required query param: customerId" }, { status: 400 })
    );
  }

  const appUser = await prisma.appUser.findUnique({
    where: { appId_externalCustomerId: { appId: app.id, externalCustomerId: customerId } },
    include: { whatsappConnection: true },
  });

  if (!appUser || appUser.status !== "ACTIVE") {
    return withCors(NextResponse.json({ status: "NOT_SUBSCRIBED" }));
  }

  if (!appUser.whatsappConnection || appUser.whatsappConnection.status !== "CONNECTED") {
    return withCors(
      NextResponse.json({
        status: "SUBSCRIBED_UNCONNECTED",
        facebookAppId: process.env.FACEBOOK_APP_ID ?? null,
        facebookConfigId: process.env.FACEBOOK_EMBEDDED_SIGNUP_CONFIG_ID ?? null,
      })
    );
  }

  return withCors(
    NextResponse.json({
      status: "CONNECTED",
      phoneNumber: appUser.whatsappConnection.displayPhoneNumber,
    })
  );
}
