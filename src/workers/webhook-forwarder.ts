import "dotenv/config";

import { redis } from "@/lib/redis";
import { processWebhookEvent, WEBHOOK_QUEUE_KEY } from "@/lib/webhook-forwarder";

const BLOCK_TIMEOUT_SECONDS = 5;

async function run() {
  console.log(`[webhook-forwarder] worker avviato, in ascolto su "${WEBHOOK_QUEUE_KEY}"`);

  let running = true;
  const shutdown = () => {
    running = false;
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  while (running) {
    try {
      const result = await redis.brpop(WEBHOOK_QUEUE_KEY, BLOCK_TIMEOUT_SECONDS);
      if (!result) {
        continue;
      }

      const [, rawBody] = result;
      await processWebhookEvent(rawBody);
    } catch (error) {
      console.error("[webhook-forwarder] errore nel loop del worker:", error);
    }
  }

  console.log("[webhook-forwarder] worker arrestato");
  process.exit(0);
}

run();
