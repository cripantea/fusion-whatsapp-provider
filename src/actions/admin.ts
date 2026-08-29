"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
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
}

// Libera una licenza (slot di maxConnections) rimuovendo una connessione che
// il cliente ha disconnesso o che è finita in errore: countAgencyConnections
// conta ogni riga WhatsappConnection a prescindere dallo stato, quindi finché
// la riga esiste lo slot resta occupato per sempre, anche a numero disconnesso.
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

// Cambia piano/stato abbonamento senza passare da Stripe: per pagamenti concordati
// fuori flusso (bonifico, accordo commerciale custom) durante l'avvio a voce delle vendite.
// maxConnectionsOverride è opzionale: se assente, la quota segue il default del piano
// scelto; se presente, sovrascrive quel default con un valore ad-hoc per questa agenzia
// (es. un accordo commerciale custom, indipendente dai piani standard).
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

// Genera un vero link Stripe Checkout per conto di un'agenzia già creata: da girare
// al titolare della carta (mai da compilare da parte del superadmin), tipicamente
// durante una vendita a voce. Stesso identico webhook/metadata del checkout self-service.
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
