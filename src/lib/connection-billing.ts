import Stripe from 'stripe';

import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';

const OPERATION_ACTIVATION = 'CONNECTION_ACTIVATION';

export type ChargeResult =
  | { success: true; invoiceId: string }
  | { success: false; requiresAction: boolean; invoiceId?: string };

/**
 * Addebita immediatamente l'attivazione di una connessione pagante.
 *
 * Idempotenza:
 * - DB: vincolo UNIQUE (connectionId, operationType) → un solo record di attivazione per connessione
 * - Stripe: se il record DB esiste già con stripeInvoiceId, si riutilizza la stessa invoice
 * - Se billingStatus è già PAID → ritorna success senza nuovi addebiti
 *
 * Outcome:
 * - PAID → connection.status = CONNECTED, billingStatus = PAID
 * - PAYMENT_FAILED → billingStatus = PAYMENT_FAILED, connection resta PENDING (non operativa)
 * - requiresAction (SCA 3DS) → billingStatus = PENDING, agency.billingStatus = REQUIRES_ACTION
 */
export async function chargeConnectionActivation({
  connectionId,
  agencyId,
}: {
  connectionId: string;
  agencyId: string;
}): Promise<ChargeResult> {
  const priceId = process.env.STRIPE_CONNECTION_ACTIVATION_PRICE_ID;
  if (!priceId) throw new Error('STRIPE_CONNECTION_ACTIVATION_PRICE_ID not configured');

  // Idempotency check: don't create a second charge if already PAID
  const existing = await prisma.connectionBilling.findUnique({
    where: { connectionId_operationType: { connectionId, operationType: OPERATION_ACTIVATION } },
  });

  if (existing?.status === 'PAID') {
    return { success: true, invoiceId: existing.stripeInvoiceId! };
  }

  const agency = await prisma.agency.findUnique({
    where: { id: agencyId },
    select: { stripeCustomerId: true, defaultPaymentMethodId: true },
  });

  if (!agency?.stripeCustomerId || !agency.defaultPaymentMethodId) {
    throw new Error('Agency billing not configured: missing Stripe customer or payment method');
  }

  const { stripeCustomerId, defaultPaymentMethodId } = agency;

  // Retry path: existing invoice from a previous attempt (e.g. network retry)
  if (existing?.stripeInvoiceId) {
    return attemptInvoicePayment({
      invoiceId: existing.stripeInvoiceId,
      connectionId,
      agencyId,
      paymentMethodId: defaultPaymentMethodId,
    });
  }

  // First attempt — create invoice item + invoice
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await stripe.invoiceItems.create({
    customer: stripeCustomerId,
    price: priceId,
    metadata: {
      agencyId,
      connectionId,
      billingOperationType: OPERATION_ACTIVATION,
    },
  } as any);

  const invoice = await stripe.invoices.create({
    customer: stripeCustomerId,
    collection_method: 'charge_automatically',
    default_payment_method: defaultPaymentMethodId,
    auto_advance: false, // finalize manually for immediate payment
    metadata: {
      agencyId,
      connectionId,
      billingOperationType: OPERATION_ACTIVATION,
    },
  });

  const finalized = await stripe.invoices.finalizeInvoice(invoice.id);

  // Persist billing record before attempting payment (idempotency safety)
  await prisma.connectionBilling.create({
    data: {
      connectionId,
      agencyId,
      operationType: OPERATION_ACTIVATION,
      stripeInvoiceId: finalized.id,
      amount: finalized.amount_due,
      currency: finalized.currency,
      status: 'PENDING',
    },
  });

  return attemptInvoicePayment({
    invoiceId: finalized.id,
    connectionId,
    agencyId,
    paymentMethodId: defaultPaymentMethodId,
  });
}

async function attemptInvoicePayment({
  invoiceId,
  connectionId,
  agencyId,
  paymentMethodId,
}: {
  invoiceId: string;
  connectionId: string;
  agencyId: string;
  paymentMethodId: string;
}): Promise<ChargeResult> {
  let paidInvoice: Stripe.Invoice & { payment_intent?: Stripe.PaymentIntent | string | null };

  try {
    paidInvoice = await stripe.invoices.pay(invoiceId, {
      payment_method: paymentMethodId,
      expand: ['payment_intent'],
    });
  } catch (err) {
    // Card declined or other hard payment failure
    await markFailed(connectionId);
    return { success: false, requiresAction: false };
  }

  if (paidInvoice.status === 'paid') {
    const pi = paidInvoice.payment_intent as Stripe.PaymentIntent | string | null;
    const paymentIntentId = typeof pi === 'string' ? pi : pi?.id ?? null;

    await prisma.$transaction([
      prisma.connectionBilling.update({
        where: { connectionId_operationType: { connectionId, operationType: OPERATION_ACTIVATION } },
        data: { status: 'PAID', stripePaymentIntentId: paymentIntentId, activationChargedAt: new Date() },
      }),
      prisma.whatsappConnection.update({
        where: { id: connectionId },
        data: { status: 'CONNECTED', billingStatus: 'PAID' },
      }),
    ]);

    return { success: true, invoiceId };
  }

  // Invoice still open: check for SCA / requires_action
  const pi = paidInvoice.payment_intent as Stripe.PaymentIntent | string | null;
  const piStatus = typeof pi === 'object' && pi !== null ? pi.status : null;
  const piId = typeof pi === 'string' ? pi : pi?.id ?? null;

  if (piStatus === 'requires_action' || piStatus === 'requires_payment_method') {
    if (piId) {
      await prisma.connectionBilling.update({
        where: { connectionId_operationType: { connectionId, operationType: OPERATION_ACTIVATION } },
        data: { stripePaymentIntentId: piId },
      });
    }
    // Agency needs to complete authentication via dashboard
    await prisma.agency.update({
      where: { id: agencyId },
      data: { billingStatus: 'REQUIRES_ACTION' },
    });
    return { success: false, requiresAction: true, invoiceId };
  }

  // Any other non-paid state
  await markFailed(connectionId);
  return { success: false, requiresAction: false };
}

async function markFailed(connectionId: string): Promise<void> {
  await prisma.$transaction([
    prisma.connectionBilling.update({
      where: { connectionId_operationType: { connectionId, operationType: OPERATION_ACTIVATION } },
      data: { status: 'PAYMENT_FAILED' },
    }),
    prisma.whatsappConnection.update({
      where: { id: connectionId },
      data: { billingStatus: 'PAYMENT_FAILED' },
    }),
  ]);
}
