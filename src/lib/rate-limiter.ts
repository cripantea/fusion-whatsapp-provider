import { NextResponse } from "next/server";
import { NextRequest } from "next/server";

import { redis } from "@/lib/redis";

// Fixed-window counter: INCR + EXPIRE on first hit.
// Precise enough for abuse prevention; upgrade to sliding window if needed.
export async function checkRateLimit(
  identifier: string,
  endpoint: string,
  limit: number,
  windowSeconds: number
): Promise<{ allowed: boolean }> {
  const key = `rl:${endpoint}:${identifier}`;
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, windowSeconds);
  }
  return { allowed: count <= limit };
}

export function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

export function rateLimitResponse(): NextResponse {
  return NextResponse.json(
    { error: "Too many requests — retry after a moment" },
    {
      status: 429,
      headers: { "Retry-After": "60" },
    }
  );
}
