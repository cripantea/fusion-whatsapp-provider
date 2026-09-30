import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), user: vi.fn(), rate: vi.fn(), fetch: vi.fn() }));
vi.mock("@/lib/api-key-auth", () => ({ authenticateAppWithSecret: mocks.auth }));
vi.mock("@/lib/prisma", () => ({ prisma: { appUser: { findUnique: mocks.user } } }));
vi.mock("@/lib/crypto", () => ({ decrypt: () => "private-token" }));
vi.mock("@/lib/rate-limiter", () => ({ checkRateLimit: mocks.rate, rateLimitResponse: () => new Response("", { status: 429 }) }));
import { allowedMediaUrl, getImageMedia, MAX_IMAGE_BYTES } from "../image-media";
const request = () => new NextRequest("https://fusionwa.test/api/v1/media/123?externalCustomerId=2");
const metadata = (extra = {}) => Response.json({ url: "https://lookaside.fbsbx.com/whatsapp_business/attachments/test", mime_type: "image/png", file_size: 3, ...extra });
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("fetch", mocks.fetch);
  mocks.auth.mockResolvedValue({ id: "app-1", apiKey: "key" });
  mocks.rate.mockResolvedValue({ allowed: true });
  mocks.user.mockResolvedValue({ status: "ACTIVE", whatsappConnection: { status: "CONNECTED", accessToken: "encrypted", phoneNumberId: "phone-2", billingStatus: "ACTIVE" } });
});
afterEach(() => vi.unstubAllGlobals());
describe("image media authorization", () => {
  it("requires server credentials before DB or Meta access", async () => {
    mocks.auth.mockResolvedValue(null);
    expect((await getImageMedia(request(), "123")).status).toBe(401);
    expect(mocks.user).not.toHaveBeenCalled(); expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("scopes the customer to the authenticated application and asks Meta to verify phone ownership", async () => {
    mocks.fetch.mockResolvedValueOnce(metadata()).mockResolvedValueOnce(new Response(new Uint8Array([1,2,3]), { headers: { "Content-Type": "image/png" } }));
    const response = await getImageMedia(request(), "123");
    expect(response.status).toBe(200);
    expect(mocks.user).toHaveBeenCalledWith(expect.objectContaining({ where: { appId_externalCustomerId: { appId: "app-1", externalCustomerId: "2" } } }));
    expect(String(mocks.fetch.mock.calls[0][0])).toBe("https://graph.facebook.com/v26.0/123?phone_number_id=phone-2");
    expect(mocks.fetch.mock.calls[1][1]).toMatchObject({ redirect: "error", headers: { Authorization: "Bearer private-token" } });
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("authorization")).toBeNull();
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([1,2,3]));
  });
  it("refuses unknown customers without fetching media", async () => {
    mocks.user.mockResolvedValue(null);
    expect((await getImageMedia(request(), "123")).status).toBe(409);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("stops after an ownership rejection by Meta", async () => {
    mocks.fetch.mockResolvedValueOnce(new Response("", { status: 400 }));
    expect((await getImageMedia(request(), "123")).status).toBe(404);
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
  });
  it("rejects nonnumeric IDs", async () => {
    expect((await getImageMedia(request(), "../other")).status).toBe(400);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("enforces rate limits", async () => {
    mocks.rate.mockResolvedValue({ allowed: false });
    expect((await getImageMedia(request(), "123")).status).toBe(429);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
});
describe("image download bounds", () => {
  it.each(["http://lookaside.fbsbx.com/a", "https://evil.test/a", "https://lookaside.fbsbx.com.evil.test/a", "https://user@lookaside.fbsbx.com/a", "https://lookaside.fbsbx.com:8443/a"])("rejects unsafe URL %s", (url) => {
    expect(allowedMediaUrl(url)).toBe(false);
  });
  it.each([
    [{ mime_type: "image/svg+xml" }, 415],
    [{ file_size: MAX_IMAGE_BYTES + 1 }, 413],
    [{ url: "https://evil.test" }, 502],
  ])("rejects invalid metadata %j", async (extra, status) => {
    mocks.fetch.mockResolvedValueOnce(metadata(extra));
    expect((await getImageMedia(request(), "123")).status).toBe(status);
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
  });
  it("limits actual bytes even without content-length", async () => {
    mocks.fetch.mockResolvedValueOnce(metadata()).mockResolvedValueOnce(new Response(new Uint8Array(MAX_IMAGE_BYTES + 1), { headers: { "Content-Type": "image/png" } }));
    expect((await getImageMedia(request(), "123")).status).toBe(413);
  });
  it("rejects mismatched download content type", async () => {
    mocks.fetch.mockResolvedValueOnce(metadata()).mockResolvedValueOnce(new Response("bad", { headers: { "Content-Type": "text/html" } }));
    expect((await getImageMedia(request(), "123")).status).toBe(415);
  });
  it("does not expose upstream exceptions or tokens", async () => {
    mocks.fetch.mockRejectedValue(new Error("private-token"));
    const response = await getImageMedia(request(), "123");
    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain("private-token");
  });
});
