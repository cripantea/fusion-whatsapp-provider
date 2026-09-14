"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { PLATFORM_DEFAULT_CONNECTION_CAP } from "@/lib/connection-limits";

async function requireAuth() {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
  return session;
}

/**
 * Attiva l'Auto Billing per l'Agency corrente.
 *
 * Requisiti server-side (mai trusted dal browser):
 * - billingStatus READY
 * - globalConnectionLimit > 0
 * - defaultAppConnectionLimit > 0
 * - defaultAppConnectionLimit <= globalConnectionLimit
 * - globalConnectionLimit <= platform safety cap (platformLimitOverride ?? 300)
 */
export async function enableAutoBillingAction(input: {
  globalConnectionLimit: number;
  defaultAppConnectionLimit: number;
}) {
  const session = await requireAuth();

  const { globalConnectionLimit, defaultAppConnectionLimit } = input;

  if (!Number.isInteger(globalConnectionLimit) || globalConnectionLimit < 1) {
    throw new Error("globalConnectionLimit deve essere un intero >= 1");
  }
  if (!Number.isInteger(defaultAppConnectionLimit) || defaultAppConnectionLimit < 1) {
    throw new Error("defaultAppConnectionLimit deve essere un intero >= 1");
  }
  if (defaultAppConnectionLimit > globalConnectionLimit) {
    throw new Error("defaultAppConnectionLimit non può superare globalConnectionLimit");
  }

  const agency = await prisma.agency.findUnique({
    where: { id: session.user.agencyId },
    select: { billingStatus: true, platformLimitOverride: true },
  });

  if (!agency) throw new Error("Agency non trovata");
  if (agency.billingStatus !== "READY") {
    throw new Error("Il billing deve essere configurato (READY) prima di attivare l'Auto Billing");
  }

  const platformCap = agency.platformLimitOverride ?? PLATFORM_DEFAULT_CONNECTION_CAP;
  if (globalConnectionLimit > platformCap) {
    throw new Error(
      `globalConnectionLimit (${globalConnectionLimit}) supera il platform cap (${platformCap})`
    );
  }

  await prisma.agency.update({
    where: { id: session.user.agencyId },
    data: {
      autoBillingEnabled: true,
      autoBillingAcceptedAt: new Date(),
      globalConnectionLimit,
      defaultAppConnectionLimit,
    },
  });

  revalidatePath("/impostazioni/billing");
}

/**
 * Disattiva l'Auto Billing.
 * Non disconnette connessioni esistenti e non annulla fatture già emesse.
 */
export async function disableAutoBillingAction() {
  const session = await requireAuth();

  await prisma.agency.update({
    where: { id: session.user.agencyId },
    data: { autoBillingEnabled: false },
  });

  revalidatePath("/impostazioni/billing");
}

/**
 * Aggiorna i limiti di connessione.
 * Auto Billing deve essere READY per modificare i limiti.
 */
export async function updateConnectionLimitsAction(input: {
  globalConnectionLimit: number;
  defaultAppConnectionLimit: number;
}) {
  const session = await requireAuth();

  const { globalConnectionLimit, defaultAppConnectionLimit } = input;

  if (!Number.isInteger(globalConnectionLimit) || globalConnectionLimit < 1) {
    throw new Error("globalConnectionLimit deve essere un intero >= 1");
  }
  if (!Number.isInteger(defaultAppConnectionLimit) || defaultAppConnectionLimit < 1) {
    throw new Error("defaultAppConnectionLimit deve essere un intero >= 1");
  }
  if (defaultAppConnectionLimit > globalConnectionLimit) {
    throw new Error("defaultAppConnectionLimit non può superare globalConnectionLimit");
  }

  const agency = await prisma.agency.findUnique({
    where: { id: session.user.agencyId },
    select: { billingStatus: true, platformLimitOverride: true },
  });

  if (!agency) throw new Error("Agency non trovata");
  if (agency.billingStatus !== "READY") {
    throw new Error("Il billing deve essere configurato (READY) per modificare i limiti");
  }

  const platformCap = agency.platformLimitOverride ?? PLATFORM_DEFAULT_CONNECTION_CAP;
  if (globalConnectionLimit > platformCap) {
    throw new Error(
      `globalConnectionLimit (${globalConnectionLimit}) supera il platform cap (${platformCap})`
    );
  }

  await prisma.agency.update({
    where: { id: session.user.agencyId },
    data: { globalConnectionLimit, defaultAppConnectionLimit },
  });

  revalidatePath("/impostazioni/billing");
}

/**
 * Riprova il pagamento per una connessione con billingStatus=PAYMENT_FAILED.
 * Solo l'Agency owner può farlo per le proprie connessioni.
 * Usa il defaultPaymentMethodId corrente (potrebbe essere cambiato rispetto al tentativo precedente).
 */
export async function retryConnectionPaymentAction(connectionId: string) {
  const session = await requireAuth();

  // Verifica ownership: la connessione appartiene a un tenant dell'Agency?
  const connection = await prisma.whatsappConnection.findUnique({
    where: { id: connectionId },
    include: { tenant: true, appUser: { include: { app: true } } },
  });

  if (!connection) throw new Error("Connessione non trovata");

  const agencyId = connection.tenant?.agencyId ?? connection.appUser?.app?.agencyId;
  if (agencyId !== session.user.agencyId) throw new Error("Accesso non autorizzato");

  if (connection.billingStatus !== "PAYMENT_FAILED") {
    throw new Error("La connessione non ha un pagamento fallito");
  }

  const { chargeConnectionActivation } = await import("@/lib/connection-billing");
  const result = await chargeConnectionActivation({ connectionId, agencyId });

  revalidatePath("/impostazioni/billing");
  return result;
}

/**
 * Avvia un nuovo Stripe Checkout in mode=setup per aggiornare il metodo di pagamento.
 * Può essere usato sia per il primo setup che per cambiare carta.
 */
export async function getPaymentMethodUpdateUrl(): Promise<string> {
  const session = await requireAuth();

  const { ensureStripeCustomer } = await import("@/lib/stripe-customer");
  const customerId = await ensureStripeCustomer(session.user.agencyId);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "setup",
    customer: customerId,
    payment_method_types: ["card"],
    billing_address_collection: "required",
    tax_id_collection: { enabled: true },
    customer_update: { name: "auto", address: "auto" },
    success_url: `${appUrl}/onboarding/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/impostazioni/billing`,
    metadata: { agencyId: session.user.agencyId },
  });

  if (!checkoutSession.url) throw new Error("Impossibile creare la sessione di setup");

  return checkoutSession.url;
}
