import { NextRequest } from "next/server";
import { getImageMedia } from "@/lib/image-media";

export const runtime = "nodejs";

export async function GET(request: NextRequest, context: { params: Promise<{ mediaId: string }> }) {
  return getImageMedia(request, (await context.params).mediaId);
}
