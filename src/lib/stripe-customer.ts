import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';

// Idempotente: riusa il Customer Stripe esistente o ne crea uno nuovo.
// Non chiamare questo più di una volta per Agency — la verifica stripeCustomerId
// garantisce che non vengano mai creati Customer duplicati.
export async function ensureStripeCustomer(agencyId: string): Promise<string> {
  const agency = await prisma.agency.findUnique({
    where: { id: agencyId },
    select: { stripeCustomerId: true, name: true },
  });

  if (!agency) throw new Error(`Agency ${agencyId} not found`);
  if (agency.stripeCustomerId) return agency.stripeCustomerId;

  const customer = await stripe.customers.create({
    name: agency.name,
    metadata: { agencyId },
  });

  await prisma.agency.update({
    where: { id: agencyId },
    data: { stripeCustomerId: customer.id },
  });

  return customer.id;
}
