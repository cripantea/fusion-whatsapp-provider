import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const agency = await prisma.agency.findUnique({ where: { id: session.user.agencyId } });
  if (!agency?.stripeCustomerId) {
    return NextResponse.json(
      { error: "Nessun abbonamento Stripe attivo per questa agency" },
      { status: 400 }
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: agency.stripeCustomerId,
    return_url: `${appUrl}/impostazioni/billing`,
  });

  return NextResponse.json({ url: portalSession.url });
}
