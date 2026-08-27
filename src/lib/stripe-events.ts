import type Stripe from "stripe";

import type { SubscriptionStatus } from "@/generated/prisma/enums";
import { getPlanForPriceId, PLAN_MAX_CONNECTIONS } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

function mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  switch (status) {
    case "active":
      return "ACTIVE";
    case "trialing":
      return "TRIALING";
    case "past_due":
      return "PAST_DUE";
    case "canceled":
      return "CANCELED";
    case "unpaid":
      return "UNPAID";
    default:
      return "INACTIVE";
  }
}

function resolvePlanFromSubscription(subscription: Stripe.Subscription) {
  const priceId = subscription.items.data[0]?.price?.id;
  return getPlanForPriceId(priceId);
}

function resolveCustomerId(customer: string | Stripe.Customer | Stripe.DeletedCustomer) {
  return typeof customer === "string" ? customer : customer.id;
}

export async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const agencyId = session.metadata?.agencyId;
  const subscriptionId =
    typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
  const customerId = session.customer ? resolveCustomerId(session.customer) : undefined;

  if (!agencyId || !subscriptionId || !customerId) {
    console.warn("[stripe-webhook] checkout.session.completed senza agencyId/subscription/customer", {
      sessionId: session.id,
    });
    return;
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const planType = resolvePlanFromSubscription(subscription) ?? "DEVELOPER";

  await prisma.agency.update({
    where: { id: agencyId },
    data: {
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
      planType,
      subscriptionStatus: mapStripeStatus(subscription.status),
      maxConnections: PLAN_MAX_CONNECTIONS[planType],
    },
  });
}

export async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId = resolveCustomerId(subscription.customer);
  const agency = await prisma.agency.findFirst({ where: { stripeCustomerId: customerId } });

  if (!agency) {
    console.warn("[stripe-webhook] customer.subscription.updated: nessuna agency per customer", {
      customerId,
    });
    return;
  }

  const planType = resolvePlanFromSubscription(subscription) ?? agency.planType;

  await prisma.agency.update({
    where: { id: agency.id },
    data: {
      stripeSubscriptionId: subscription.id,
      planType,
      subscriptionStatus: mapStripeStatus(subscription.status),
      maxConnections: PLAN_MAX_CONNECTIONS[planType],
    },
  });
}

export async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = resolveCustomerId(subscription.customer);
  const agency = await prisma.agency.findFirst({ where: { stripeCustomerId: customerId } });

  if (!agency) {
    console.warn("[stripe-webhook] customer.subscription.deleted: nessuna agency per customer", {
      customerId,
    });
    return;
  }

  await prisma.agency.update({
    where: { id: agency.id },
    data: {
      subscriptionStatus: "CANCELED",
      planType: "DEVELOPER",
      maxConnections: PLAN_MAX_CONNECTIONS.DEVELOPER,
    },
  });
}
