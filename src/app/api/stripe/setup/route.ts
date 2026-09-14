import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { ensureStripeCustomer } from "@/lib/stripe-customer";
import { stripe } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const agencyId = session.user.agencyId;
  const customerId = await ensureStripeCustomer(agencyId);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "setup",
    customer: customerId,
    payment_method_types: ["card"],
    billing_address_collection: "required",
    // Tax ID opzionale: disponibile solo per alcuni Paesi; Stripe lo gestisce da solo
    // se il Customer è in uno dei Paesi supportati.
    tax_id_collection: { enabled: true },
    customer_update: { name: "auto", address: "auto" },
    success_url: `${appUrl}/onboarding/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/onboarding/billing`,
    metadata: { agencyId },
  });

  if (!checkoutSession.url) {
    return NextResponse.json({ error: "Impossibile creare la sessione di setup" }, { status: 502 });
  }

  return NextResponse.json({ url: checkoutSession.url });
}
