import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import { redis } from "@/lib/redis";

export const runtime = "nodejs";

const WEBHOOK_QUEUE_KEY = "whatsapp:webhook:events";
const SIGNATURE_PREFIX = "sha256=";

export async function GET(request: NextRequest) {
  const verifyToken = process.env.WHATSAPP_CLOUD_VERIFY_TOKEN;
  if (!verifyToken) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const challenge = searchParams.get("hub.challenge");
  const token = searchParams.get("hub.verify_token");

  if (mode === "subscribe" && token === verifyToken && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function POST(request: NextRequest) {
  const appSecret = process.env.WHATSAPP_CLOUD_APP_SECRET;
  if (!appSecret) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const rawBody = await request.text();
  const signatureHeader = request.headers.get("x-hub-signature-256");

  if (!isValidSignature(rawBody, signatureHeader, appSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await redis.lpush(WEBHOOK_QUEUE_KEY, rawBody);

  return NextResponse.json({ status: "success" }, { status: 200 });
}

function isValidSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string
): boolean {
  if (!signatureHeader?.startsWith(SIGNATURE_PREFIX)) {
    return false;
  }

  const providedSignature = signatureHeader.slice(SIGNATURE_PREFIX.length);
  const expectedSignature = createHmac("sha256", appSecret)
    .update(rawBody, "utf8")
    .digest("hex");

  const providedBuffer = Buffer.from(providedSignature, "hex");
  const expectedBuffer = Buffer.from(expectedSignature, "hex");

  if (providedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(providedBuffer, expectedBuffer);
}
