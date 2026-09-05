export type NormalizedWebhookUrl = { ok: true; url: string | null } | { ok: false };

export function normalizeWebhookUrl(value: unknown): NormalizedWebhookUrl {
  if (value === null || value === undefined || value === "") {
    return { ok: true, url: null };
  }

  if (typeof value !== "string") {
    return { ok: false };
  }

  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { ok: false };
    }
    return { ok: true, url: parsed.toString() };
  } catch {
    return { ok: false };
  }
}
