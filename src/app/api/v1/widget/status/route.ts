import { NextRequest, NextResponse } from "next/server";

import { authenticateApp } from "@/lib/api-key-auth";
import { corsPreflight, withCors } from "@/lib/cors";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limiter";

export const runtime = "nodejs";

export async function OPTIONS() {
  return corsPreflight();
}

const CUSTOMER_ID_MAX_LENGTH = 255;

export async function GET(request: NextRequest) {
  const app = await authenticateApp(request);
  if (!app) {
    return withCors(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
  }

  // 300 status/min per chiave API (5/sec): il widget fa polling; limite generoso ma non illimitato
  const rl = await checkRateLimit(app.apiKey, "widget-status", 300, 60);
  if (!rl.allowed) return withCors(rateLimitResponse());

  const customerId = request.nextUrl.searchParams.get("customerId");
  if (!customerId) {
    return withCors(
      NextResponse.json({ error: "Missing required query param: customerId" }, { status: 400 })
    );
  }
  if (customerId.length > CUSTOMER_ID_MAX_LENGTH) {
    return withCors(NextResponse.json({ status: "NOT_SUBSCRIBED" }));
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
      // Non sono segreti (a differenza del token, mai esposto): un'app come
      // sinistripro ne ha bisogno per popolare la propria tabella locale e
      // riconoscere a chi appartiene ogni evento nel proprio webhook.
      wabaId: appUser.whatsappConnection.wabaId,
      phoneNumberId: appUser.whatsappConnection.phoneNumberId,
    })
  );
}
