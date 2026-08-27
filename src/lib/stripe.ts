import Stripe from "stripe";

const globalForStripe = globalThis as unknown as {
  stripe: Stripe | undefined;
};

// STRIPE_API_BASE_URL è opzionale, usato solo per puntare a un server Stripe
// finto durante i test locali (es. http://localhost:4300). In produzione non va impostato.
function buildConfig(): Stripe.StripeConfig {
  const override = process.env.STRIPE_API_BASE_URL;
  if (!override) return {};

  const url = new URL(override);
  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : undefined,
    protocol: url.protocol === "http:" ? "http" : "https",
  };
}

function createStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }
  return new Stripe(secretKey, buildConfig());
}

export const stripe = globalForStripe.stripe ?? createStripeClient();

if (process.env.NODE_ENV !== "production") {
  globalForStripe.stripe = stripe;
}
