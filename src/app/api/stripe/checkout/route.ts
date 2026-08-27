import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { getPriceIdForPlan, isPaidPlanType } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export const runtime = "nodejs";

type CheckoutBody = {
  planType?: string;
};

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: CheckoutBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { planType } = body;
  if (!planType || !isPaidPlanType(planType)) {
    return NextResponse.json(
      { error: "planType deve essere uno tra TEAM, AGENCY, ENTERPRISE" },
      { status: 400 }
    );
  }

  const priceId = getPriceIdForPlan(planType);
  if (!priceId) {
    return NextResponse.json(
      { error: `Nessun price Stripe configurato per il piano ${planType}` },
      { status: 500 }
    );
  }

  const agency = await prisma.agency.findUnique({ where: { id: session.user.agencyId } });
  if (!agency) {
    return NextResponse.json({ error: "Agency not found" }, { status: 404 });
  }

  let customerId = agency.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      name: agency.name,
      metadata: { agencyId: agency.id },
    });
    customerId = customer.id;
    await prisma.agency.update({
      where: { id: agency.id },
      data: { stripeCustomerId: customerId },
    });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/impostazioni/billing?checkout=success`,
    cancel_url: `${appUrl}/impostazioni/billing?checkout=cancelled`,
    metadata: { agencyId: agency.id, planType },
    subscription_data: {
      metadata: { agencyId: agency.id, planType },
    },
  });

  if (!checkoutSession.url) {
    return NextResponse.json({ error: "Impossibile creare la sessione di checkout" }, { status: 502 });
  }

  return NextResponse.json({ url: checkoutSession.url });
}
