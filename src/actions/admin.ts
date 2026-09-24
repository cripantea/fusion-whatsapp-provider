"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { ensureStripeCustomer } from "@/lib/stripe-customer";
import { isSuperAdminEmail } from "@/lib/superadmin";
import {
  getPriceIdForPlan,
  isPaidPlanType,
  isPlanType,
  PLAN_MAX_CONNECTIONS,
} from "@/lib/plans";

const PASSWORD_MIN_LENGTH = 8;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_HASH_ROUNDS = 12;
const DEFAULT_TENANT_NAME = "Workspace principale";

async function requireSuperAdmin() {
  const session = await auth();
  if (!session || !isSuperAdminEmail(session.user.email)) {
    throw new Error("Unauthorized");
  }
  return session;
}

/**
 * @deprecated LEGACY — libera uno slot nel vecchio sistema maxConnections.
 * Nel nuovo modello le connessioni DISCONNECTED/ERROR sono già escluse dal conteggio effettivo;
 * questa action resta per pulizia dati manuale da parte del superadmin.
 */
export async function unlockConnectionAction(connectionId: string) {
  await requireSuperAdmin();

  const connection = await prisma.whatsappConnection.findUnique({
    where: { id: connectionId },
  });
  if (!connection) {
    throw new Error("Connessione non trovata");
  }
  if (connection.status !== "DISCONNECTED" && connection.status !== "ERROR") {
    throw new Error("Si può sbloccare solo una connessione disconnessa o in errore");
  }

  await prisma.whatsappConnection.delete({ where: { id: connectionId } });

  revalidatePath("/admin");
}

// Crea un'agenzia per conto di un cliente acquisito a voce (telefono/di persona),
// mirror di /api/auth/register: stessa Agency + Tenant di default + User, ma
// innescato dal superadmin invece che dal self-service.
export async function createSubscriberAction(input: {
  agencyName: string;
  email: string;
  password: string;
}) {
  await requireSuperAdmin();

  const agencyName = input.agencyName.trim();
  const email = input.email.trim().toLowerCase();
  const password = input.password;

  if (!agencyName) {
    throw new Error("Nome agenzia obbligatorio");
  }
  if (!email || !EMAIL_PATTERN.test(email)) {
    throw new Error("Email non valida");
  }
  if (!password || password.length < PASSWORD_MIN_LENGTH) {
    throw new Error(`La password deve avere almeno ${PASSWORD_MIN_LENGTH} caratteri`);
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new Error("Email già registrata");
  }

  const passwordHash = await bcrypt.hash(password, PASSWORD_HASH_ROUNDS);

  await prisma.$transaction(async (tx) => {
    const agency = await tx.agency.create({
      data: { name: agencyName, planType: "DEVELOPER", maxConnections: PLAN_MAX_CONNECTIONS.DEVELOPER },
    });
    await tx.tenant.create({
      data: { agencyId: agency.id, name: DEFAULT_TENANT_NAME },
    });
    await tx.user.create({
      data: { agencyId: agency.id, email, passwordHash, name: agencyName },
    });
  });

  revalidatePath("/admin");
}

/**
 * @deprecated LEGACY — cambia piano/stato con il vecchio sistema a piani fissi.
 * Per operazioni manuali superadmin usare updateAgencyBillingStatusAction e setAgencyPlatformLimitOverrideAction.
 */
export async function updateAgencyPlanAction(input: {
  agencyId: string;
  planType: string;
  subscriptionStatus: string;
  maxConnectionsOverride?: number;
}) {
  await requireSuperAdmin();

  if (!isPlanType(input.planType)) {
    throw new Error("Piano non valido");
  }
  const validStatuses = ["INACTIVE", "TRIALING", "ACTIVE", "PAST_DUE", "CANCELED", "UNPAID"];
  if (!validStatuses.includes(input.subscriptionStatus)) {
    throw new Error("Stato abbonamento non valido");
  }
  if (
    input.maxConnectionsOverride !== undefined &&
    (!Number.isInteger(input.maxConnectionsOverride) || input.maxConnectionsOverride < 0)
  ) {
    throw new Error("Il limite connessioni deve essere un numero intero >= 0");
  }

  await prisma.agency.update({
    where: { id: input.agencyId },
    data: {
      planType: input.planType,
      subscriptionStatus: input.subscriptionStatus as never,
      maxConnections: input.maxConnectionsOverride ?? PLAN_MAX_CONNECTIONS[input.planType],
    },
  });

  revalidatePath("/admin");
}

/** @deprecated LEGACY — genera un checkout Stripe per i vecchi piani fissi. */
export async function generateCheckoutLinkAction(input: { agencyId: string; planType: string }) {
  await requireSuperAdmin();

  if (!isPaidPlanType(input.planType)) {
    throw new Error("Il piano deve essere TEAM, AGENCY o ENTERPRISE");
  }

  const priceId = getPriceIdForPlan(input.planType);
  if (!priceId) {
    throw new Error(`Nessun price Stripe configurato per il piano ${input.planType}`);
  }

  const agency = await prisma.agency.findUnique({ where: { id: input.agencyId } });
  if (!agency) {
    throw new Error("Agenzia non trovata");
  }

  let customerId = agency.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      name: agency.name,
      metadata: { agencyId: agency.id },
    });
    customerId = customer.id;
    await prisma.agency.update({ where: { id: agency.id }, data: { stripeCustomerId: customerId } });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/login?checkout=success`,
    cancel_url: `${appUrl}/login?checkout=cancelled`,
    metadata: { agencyId: agency.id, planType: input.planType },
    subscription_data: {
      metadata: { agencyId: agency.id, planType: input.planType },
    },
  });

  if (!checkoutSession.url) {
    throw new Error("Impossibile creare la sessione di checkout");
  }

  return { url: checkoutSession.url };
}

// ── NUOVO MODELLO BILLING ──────────────────────────────────────────────────────

/** Imposta manualmente il billingStatus di un'agenzia (es. dopo aver verificato
 *  un pagamento fuori-banda o risolto una sospensione). */
export async function updateAgencyBillingStatusAction(input: {
  agencyId: string;
  billingStatus: string;
}) {
  await requireSuperAdmin();

  const validStatuses = ["NOT_CONFIGURED", "READY", "REQUIRES_ACTION", "PAST_DUE", "SUSPENDED"];
  if (!validStatuses.includes(input.billingStatus)) {
    throw new Error("Billing status non valido");
  }

  await prisma.agency.update({
    where: { id: input.agencyId },
    data: { billingStatus: input.billingStatus as never },
  });

  revalidatePath("/admin");
}

/** Imposta/rimuove l'esenzione dalla fatturazione per un'agenzia (es. account test/proprietario). */
export async function setAgencyBillingExemptAction(input: {
  agencyId: string;
  billingExempt: boolean;
}) {
  await requireSuperAdmin();

  await prisma.agency.update({
    where: { id: input.agencyId },
    data: { billingExempt: input.billingExempt },
  });

  revalidatePath("/admin");
}

/** Imposta il platform safety cap per un'agenzia specifica (superadmin-only).
 *  null rimuove l'override e ripristina PLATFORM_DEFAULT_CONNECTION_CAP (300). */
export async function setAgencyPlatformLimitOverrideAction(input: {
  agencyId: string;
  platformLimitOverride: number | null;
}) {
  await requireSuperAdmin();

  if (
    input.platformLimitOverride !== null &&
    (!Number.isInteger(input.platformLimitOverride) || input.platformLimitOverride < 1)
  ) {
    throw new Error("Il platform limit override deve essere un intero >= 1 oppure null");
  }

  await prisma.agency.update({
    where: { id: input.agencyId },
    data: { platformLimitOverride: input.platformLimitOverride },
  });

  revalidatePath("/admin");
}

/** Sospende l'operatività dell'account senza cancellare utenti, dati o connessioni. */
export async function suspendAgencyAction(agencyId: string) {
  const session = await requireSuperAdmin();
  if (session.user.agencyId === agencyId) {
    throw new Error("Non puoi sospendere l'account che contiene il tuo utente amministratore");
  }

  const agency = await prisma.agency.findUnique({ where: { id: agencyId }, select: { id: true } });
  if (!agency) throw new Error("Account non trovato");

  await prisma.agency.update({
    where: { id: agencyId },
    data: { billingStatus: "SUSPENDED", autoBillingEnabled: false },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/utenti");
}

/**
 * Riattiva un account sospeso. READY viene ripristinato solo se il setup Stripe
 * è realmente completo; altrimenti il cliente torna all'onboarding billing.
 */
export async function reactivateAgencyAction(agencyId: string) {
  await requireSuperAdmin();

  const agency = await prisma.agency.findUnique({
    where: { id: agencyId },
    select: {
      billingStatus: true,
      stripeCustomerId: true,
      defaultPaymentMethodId: true,
      billingSetupCompletedAt: true,
    },
  });
  if (!agency) throw new Error("Account non trovato");
  if (agency.billingStatus !== "SUSPENDED") throw new Error("L'account non è sospeso");

  const isReady = Boolean(
    agency.stripeCustomerId && agency.defaultPaymentMethodId && agency.billingSetupCompletedAt
  );
  await prisma.agency.update({
    where: { id: agencyId },
    data: { billingStatus: isReady ? "READY" : "NOT_CONFIGURED" },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/utenti");
}

/** Genera un nuovo link Stripe Setup per sbloccare un cliente fermo nell'onboarding. */
export async function createBillingSetupLinkAction(agencyId: string) {
  await requireSuperAdmin();

  const agency = await prisma.agency.findUnique({
    where: { id: agencyId },
    select: { id: true, billingStatus: true },
  });
  if (!agency) throw new Error("Account non trovato");
  if (agency.billingStatus === "SUSPENDED") {
    throw new Error("Riattiva l'account prima di generare il link");
  }

  const customerId = await ensureStripeCustomer(agencyId);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "setup",
    customer: customerId,
    payment_method_types: ["card"],
    billing_address_collection: "required",
    tax_id_collection: { enabled: true },
    customer_update: { name: "auto", address: "auto" },
    success_url: `${appUrl}/onboarding/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/onboarding/billing`,
    metadata: { agencyId },
  });

  if (!checkoutSession.url) throw new Error("Stripe non ha restituito il link di setup");
  return { url: checkoutSession.url };
}
