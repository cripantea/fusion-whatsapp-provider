import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";

export const WEBHOOK_QUEUE_KEY = "whatsapp:webhook:events";
export const WEBHOOK_DEAD_LETTER_QUEUE_KEY = "whatsapp:webhook:events:dead-letter";

const MAX_ATTEMPTS = 3;
const REQUEST_TIMEOUT_MS = 10_000;
const RETRY_BASE_DELAY_MS = 500;

type MetaWebhookPayload = {
  entry?: Array<{
    id?: string;
    changes?: Array<{
      value?: {
        metadata?: {
          phone_number_id?: string;
        };
      };
    }>;
  }>;
};

export type WebhookIdentifiers = {
  wabaId?: string;
  phoneNumberId?: string;
};

export type DeliveryResult = {
  success: boolean;
  attempts: number;
  lastStatus?: number;
  lastError?: string;
};

export function extractIdentifiers(payload: MetaWebhookPayload): WebhookIdentifiers {
  const entry = payload.entry?.[0];
  return {
    wabaId: entry?.id,
    phoneNumberId: entry?.changes?.[0]?.value?.metadata?.phone_number_id,
  };
}

export async function findTargetConnections(identifiers: WebhookIdentifiers) {
  const { wabaId, phoneNumberId } = identifiers;

  if (phoneNumberId) {
    const connection = await prisma.whatsappConnection.findUnique({
      where: { phoneNumberId },
    });
    if (connection) {
      return [connection];
    }
  }

  if (wabaId) {
    return prisma.whatsappConnection.findMany({ where: { wabaId } });
  }

  return [];
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function deliverWebhook(
  targetUrl: string,
  rawBody: string
): Promise<DeliveryResult> {
  let lastStatus: number | undefined;
  let lastError: string | undefined;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(targetUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "FusionWhatsAppProvider-WebhookForwarder/1.0",
        },
        body: rawBody,
        signal: controller.signal,
      });

      lastStatus = response.status;

      if (response.ok) {
        return { success: true, attempts: attempt, lastStatus };
      }

      if (response.status < 500) {
        // Errore lato cliente (4xx): non ha senso ritentare, la richiesta è stata rifiutata deliberatamente.
        return { success: false, attempts: attempt, lastStatus };
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    } finally {
      clearTimeout(timeout);
    }

    if (attempt < MAX_ATTEMPTS) {
      await delay(RETRY_BASE_DELAY_MS * attempt);
    }
  }

  return { success: false, attempts: MAX_ATTEMPTS, lastStatus, lastError };
}

export async function processWebhookEvent(rawBody: string): Promise<void> {
  let payload: MetaWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    console.error("[webhook-forwarder] payload non valido, JSON non parsabile");
    return;
  }

  const identifiers = extractIdentifiers(payload);
  if (!identifiers.phoneNumberId && !identifiers.wabaId) {
    console.warn("[webhook-forwarder] impossibile estrarre wabaId/phoneNumberId dal payload");
    return;
  }

  const connections = await findTargetConnections(identifiers);
  if (connections.length === 0) {
    console.warn(
      `[webhook-forwarder] nessuna connessione trovata per waba=${identifiers.wabaId ?? "n/a"} phone=${identifiers.phoneNumberId ?? "n/a"}`
    );
    return;
  }

  for (const connection of connections) {
    if (!connection.targetWebhookUrl) {
      console.warn(
        `[webhook-forwarder] connessione ${connection.id} senza target_webhook_url, skip`
      );
      continue;
    }

    const result = await deliverWebhook(connection.targetWebhookUrl, rawBody);

    if (result.success) {
      console.log(
        `[webhook-forwarder] consegnato a ${connection.targetWebhookUrl} (tentativi=${result.attempts}, status=${result.lastStatus})`
      );
      continue;
    }

    console.error(
      `[webhook-forwarder] consegna fallita a ${connection.targetWebhookUrl} dopo ${result.attempts} tentativi (status=${result.lastStatus ?? "n/a"}, error=${result.lastError ?? "n/a"})`
    );

    await redis.lpush(
      WEBHOOK_DEAD_LETTER_QUEUE_KEY,
      JSON.stringify({
        connectionId: connection.id,
        targetUrl: connection.targetWebhookUrl,
        payload: rawBody,
        failedAt: new Date().toISOString(),
        attempts: result.attempts,
        lastStatus: result.lastStatus ?? null,
        lastError: result.lastError ?? null,
      })
    );
  }
}
