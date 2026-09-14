import type Stripe from "stripe";

import type { AgencyBillingStatus, SubscriptionStatus } from "@/generated/prisma/enums";
import { getPlanForPriceId, PLAN_MAX_CONNECTIONS } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

// ── LEGACY SUBSCRIPTION HANDLERS ──────────────────────────────────────────────
// Mantenuti per compatibilità con i vecchi piani Stripe (DEVELOPER/TEAM/AGENCY/ENTERPRISE).
// IMPORTANTE: non possono impostare billingStatus=READY perché READY richiede
// stripeCustomerId + defaultPaymentMethodId + billingSetupCompletedAt, che vengono
// impostati solo dall'handler del SetupIntent (handleSetupSessionCompleted).

/** @deprecated Maps to legacy SubscriptionStatus enum. */
function mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  switch (status) {
    case "active":   return "ACTIVE";
    case "trialing": return "TRIALING";
    case "past_due": return "PAST_DUE";
    case "canceled": return "CANCELED";
    case "unpaid":   return "UNPAID";
    default:         return "INACTIVE";
  }
}

/**
 * Mappa lo stato di una subscription Stripe al nuovo AgencyBillingStatus.
 * Non imposta mai READY: una subscription attiva non è sufficiente — l'Agency
 * deve aver completato il setup del metodo di pagamento nel nuovo flusso.
 * Aggiorna solo stati negativi (blocchi o errori di pagamento).
 * Ritorna null se lo stato non richiede un cambio di billingStatus.
 */
function mapStripeSubscriptionToBillingStatus(
  status: Stripe.Subscription.Status
): AgencyBillingStatus | null {
  switch (status) {
    case "past_due": return "PAST_DUE";
    case "unpaid":   return "REQUIRES_ACTION";
    case "canceled": return "NOT_CONFIGURED";
    default:         return null; // active/trialing: don't touch billingStatus
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
  if (session.mode === "setup") {
    await handleSetupSessionCompleted(session);
    return;
  }

  // Legacy subscription checkout
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
  const newBillingStatus = mapStripeSubscriptionToBillingStatus(subscription.status);

  await prisma.agency.update({
    where: { id: agencyId },
    data: {
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
      // LEGACY fields — mantenuti in sync per audit/rollback
      planType,
      subscriptionStatus: mapStripeStatus(subscription.status),
      maxConnections: PLAN_MAX_CONNECTIONS[planType],
      // Nuovo modello: aggiorna solo stati negativi; READY viene impostato solo da handleSetupSessionCompleted
      ...(newBillingStatus !== null ? { billingStatus: newBillingStatus } : {}),
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
  const newBillingStatus = mapStripeSubscriptionToBillingStatus(subscription.status);

  await prisma.agency.update({
    where: { id: agency.id },
    data: {
      stripeSubscriptionId: subscription.id,
      // LEGACY fields
      planType,
      subscriptionStatus: mapStripeStatus(subscription.status),
      maxConnections: PLAN_MAX_CONNECTIONS[planType],
      // Nuovo modello
      ...(newBillingStatus !== null ? { billingStatus: newBillingStatus } : {}),
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
      // LEGACY fields
      subscriptionStatus: "CANCELED",
      planType: "DEVELOPER",
      maxConnections: PLAN_MAX_CONNECTIONS.DEVELOPER,
      // Nuovo modello: subscription cancellata → billing non più configurato
      billingStatus: "NOT_CONFIGURED",
    },
  });
}

// ── NUOVO MODELLO — SETUP PAYMENT METHOD ──────────────────────────────────────

/**
 * Gestisce il ritorno da Stripe Checkout in mode="setup".
 * Questo è l'unico handler autorizzato a impostare billingStatus=READY.
 * Requisiti verificati prima di impostare READY:
 * - SetupIntent riuscito
 * - PaymentMethod appartiene allo Stripe Customer dell'Agency
 */
async function handleSetupSessionCompleted(session: Stripe.Checkout.Session) {
  const agencyId = session.metadata?.agencyId;
  if (!agencyId) {
    console.warn("[stripe-webhook] setup session senza agencyId", { sessionId: session.id });
    return;
  }

  const setupIntentId =
    typeof session.setup_intent === "string" ? session.setup_intent : session.setup_intent?.id;
  if (!setupIntentId) {
    console.warn("[stripe-webhook] setup session senza setup_intent", { sessionId: session.id });
    return;
  }

  const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);
  if (setupIntent.status !== "succeeded") return;

  const paymentMethodId =
    typeof setupIntent.payment_method === "string"
      ? setupIntent.payment_method
      : setupIntent.payment_method?.id;
  if (!paymentMethodId) return;

  // Security: verify PM belongs to this agency's Stripe customer
  const agency = await prisma.agency.findUnique({
    where: { id: agencyId },
    select: { stripeCustomerId: true, billingStatus: true },
  });
  if (!agency?.stripeCustomerId) {
    console.warn("[stripe-webhook] agency senza stripeCustomerId", { agencyId });
    return;
  }

  const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
  if (pm.customer !== agency.stripeCustomerId) {
    console.error("[stripe-webhook] PaymentMethod appartiene a Customer diverso dall'Agency", {
      agencyId,
      pmCustomer: pm.customer,
      expectedCustomer: agency.stripeCustomerId,
    });
    return;
  }

  // Set as default for future off-session charges
  await stripe.customers.update(agency.stripeCustomerId, {
    invoice_settings: { default_payment_method: paymentMethodId },
  });

  // Idempotent: don't downgrade READY → READY again (also handles webhook replay)
  await prisma.agency.update({
    where: { id: agencyId },
    data: {
      defaultPaymentMethodId: paymentMethodId,
      billingSetupCompletedAt: agency.billingStatus === "READY" ? undefined : new Date(),
      billingStatus: "READY",
    },
  });
}

// ── NUOVO MODELLO — INVOICE PAYMENT ───────────────────────────────────────────

export async function handleInvoicePaid(invoice: Stripe.Invoice & { payment_intent?: Stripe.PaymentIntent | string | null }) {
  const { agencyId, connectionId, billingOperationType } = invoice.metadata ?? {};
  if (!agencyId || !connectionId || billingOperationType !== "CONNECTION_ACTIVATION") return;

  const existing = await prisma.connectionBilling.findUnique({
    where: { connectionId_operationType: { connectionId, operationType: "CONNECTION_ACTIVATION" } },
  });
  if (existing?.status === "PAID") return; // Idempotent: already processed

  const piId =
    typeof invoice.payment_intent === "string"
      ? invoice.payment_intent
      : invoice.payment_intent?.id ?? null;

  await prisma.$transaction([
    prisma.connectionBilling.update({
      where: { connectionId_operationType: { connectionId, operationType: "CONNECTION_ACTIVATION" } },
      data: {
        status: "PAID",
        stripePaymentIntentId: piId,
        activationChargedAt: new Date(),
      },
    }),
    prisma.whatsappConnection.update({
      where: { id: connectionId },
      data: { status: "CONNECTED", billingStatus: "PAID" },
    }),
  ]);
}

export async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const { agencyId, connectionId, billingOperationType } = invoice.metadata ?? {};
  if (!agencyId || !connectionId || billingOperationType !== "CONNECTION_ACTIVATION") return;

  const existing = await prisma.connectionBilling.findUnique({
    where: { connectionId_operationType: { connectionId, operationType: "CONNECTION_ACTIVATION" } },
  });
  if (existing?.status === "PAID") return; // Don't downgrade a successful payment

  await prisma.$transaction([
    prisma.connectionBilling.update({
      where: { connectionId_operationType: { connectionId, operationType: "CONNECTION_ACTIVATION" } },
      data: { status: "PAYMENT_FAILED" },
    }),
    prisma.whatsappConnection.update({
      where: { id: connectionId },
      data: { billingStatus: "PAYMENT_FAILED" },
    }),
  ]);
}
