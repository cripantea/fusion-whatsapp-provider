import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';
import { getAgencyActiveConnectionCount } from '@/lib/connection-limits';

function priceId(): string {
  const id = process.env.STRIPE_CONNECTION_SUBSCRIPTION_PRICE_ID;
  if (!id) throw new Error('STRIPE_CONNECTION_SUBSCRIPTION_PRICE_ID not configured');
  return id;
}

/**
 * Returns true if the subscription uses the per-connection graduated price.
 * Used to guard legacy subscription handlers from acting on connection subscriptions.
 */
export function isConnectionSubscription(subscription: {
  items: { data: Array<{ price: { id: string } }> };
}): boolean {
  const id = process.env.STRIPE_CONNECTION_SUBSCRIPTION_PRICE_ID;
  if (!id) return false;
  return subscription.items.data.some((item) => item.price.id === id);
}

/**
 * Syncs the agency's Stripe subscription quantity to the current CONNECTED count.
 * - Creates subscription if none exists and count > 0
 * - Updates quantity on existing subscription
 * - Cancels subscription if count drops to 0
 *
 * Idempotent: safe to call after every connection status change.
 */
export async function syncConnectionSubscription(agencyId: string): Promise<void> {
  const agency = await prisma.agency.findUnique({
    where: { id: agencyId },
    select: {
      stripeCustomerId: true,
      stripeSubscriptionId: true,
      defaultPaymentMethodId: true,
      billingExempt: true,
    },
  });

  // Exempt accounts and accounts without Stripe customer never need a subscription.
  if (!agency?.stripeCustomerId || agency.billingExempt) return;

  const count = await getAgencyActiveConnectionCount(agencyId);

  if (agency.stripeSubscriptionId) {
    const existing = await stripe.subscriptions.retrieve(agency.stripeSubscriptionId);

    // If this is a legacy plan subscription (TEAM/AGENCY/ENTERPRISE), don't touch it.
    if (!isConnectionSubscription(existing)) {
      console.warn('[connection-subscription] legacy subscription found, skipping sync', { agencyId });
      return;
    }

    if (count === 0) {
      await stripe.subscriptions.cancel(agency.stripeSubscriptionId);
      await prisma.agency.update({ where: { id: agencyId }, data: { stripeSubscriptionId: null } });
      return;
    }

    const itemId = existing.items.data[0]?.id;
    if (itemId) {
      await stripe.subscriptionItems.update(itemId, { quantity: count });
    }
    return;
  }

  // No subscription yet — create one if there are billable connections.
  if (count === 0) return;

  const sub = await stripe.subscriptions.create({
    customer: agency.stripeCustomerId,
    items: [{ price: priceId(), quantity: count }],
    collection_method: 'charge_automatically',
    ...(agency.defaultPaymentMethodId
      ? { default_payment_method: agency.defaultPaymentMethodId }
      : {}),
    metadata: { agencyId },
  });

  await prisma.agency.update({
    where: { id: agencyId },
    data: { stripeSubscriptionId: sub.id },
  });
}
