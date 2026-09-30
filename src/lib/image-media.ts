import { NextRequest, NextResponse } from "next/server";
import { authenticateAppWithSecret } from "@/lib/api-key-auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limiter";

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function allowedMediaUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password &&
      (!url.port || url.port === "443") && url.hostname === "lookaside.fbsbx.com";
  } catch { return false; }
}

export async function getImageMedia(request: NextRequest, mediaId: string) {
  const fail = (status: number, error: string) => NextResponse.json({ error }, {
    status, headers: { "Cache-Control": "private, no-store" },
  });
  const app = await authenticateAppWithSecret(request);
  if (!app) return fail(401, "Unauthorized");
  const customerId = request.nextUrl.searchParams.get("externalCustomerId");
  if (!customerId || customerId.length > 255 || !/^\d{1,64}$/.test(mediaId)) {
    return fail(400, "Invalid mediaId or externalCustomerId");
  }
  if (!(await checkRateLimit(app.apiKey, "image-media", 120, 60)).allowed) return rateLimitResponse();
  const user = await prisma.appUser.findUnique({
    where: { appId_externalCustomerId: { appId: app.id, externalCustomerId: customerId } },
    include: { whatsappConnection: true },
  });
  const connection = user?.whatsappConnection;
  if (user?.status !== "ACTIVE" || connection?.status !== "CONNECTED" || !connection.accessToken) {
    return fail(409, "No active connection");
  }
  if (connection.billingStatus === "PAYMENT_FAILED") return fail(402, "Payment required");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const headers = { Authorization: `Bearer ${decrypt(connection.accessToken)}` };
    // Meta verifies ownership of the media against this server-selected phone number.
    const url = new URL(`https://graph.facebook.com/v26.0/${mediaId}`);
    url.searchParams.set("phone_number_id", connection.phoneNumberId);
    const metadataResponse = await fetch(url, { headers, signal: controller.signal, redirect: "error", cache: "no-store" });
    if (!metadataResponse.ok) return fail(404, "Image unavailable or not owned by this connection");
    const metadata = await metadataResponse.json();
    if (!IMAGE_TYPES.has(metadata.mime_type)) return fail(415, "Unsupported image type");
    if (Number(metadata.file_size) > MAX_IMAGE_BYTES) return fail(413, "Image too large");
    if (typeof metadata.url !== "string" || !allowedMediaUrl(metadata.url)) return fail(502, "Invalid media location");
    const download = await fetch(metadata.url, { headers, signal: controller.signal, redirect: "error", cache: "no-store" });
    if (!download.ok || !download.body) return fail(404, "Image unavailable");
    const mime = download.headers.get("content-type")?.split(";")[0].trim();
    if (!mime || !IMAGE_TYPES.has(mime) || mime !== metadata.mime_type) {
      await download.body.cancel();
      return fail(415, "Unsupported image type");
    }
    if (Number(download.headers.get("content-length")) > MAX_IMAGE_BYTES) {
      await download.body.cancel();
      return fail(413, "Image too large");
    }
    const reader = download.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_IMAGE_BYTES) { await reader.cancel(); return fail(413, "Image too large"); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    return new NextResponse(bytes, { headers: {
      "Content-Type": mime, "Content-Length": String(size), "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff", "Content-Disposition": "inline",
    } });
  } catch {
    return fail(controller.signal.aborted ? 504 : 502, "Image retrieval failed");
  } finally { clearTimeout(timer); }
}
