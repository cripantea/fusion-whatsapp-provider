"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { generateApiCredentials, hashApiSecret } from "@/lib/api-key-auth";
import { prisma } from "@/lib/prisma";

export async function createAppAction(name: string) {
  const session = await auth();
  if (!session) {
    throw new Error("Unauthorized");
  }

  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new Error("Nome applicazione obbligatorio");
  }

  const { apiKey, rawApiSecret } = generateApiCredentials();
  const apiSecret = await hashApiSecret(rawApiSecret);

  const app = await prisma.app.create({
    data: { name: trimmedName, agencyId: session.user.agencyId, apiKey, apiSecret },
  });

  revalidatePath("/impostazioni/applicazioni");

  // rawApiSecret esiste solo qui: dopo questa risposta non è più recuperabile,
  // né in chiaro né dal DB (è salvato solo il suo hash bcrypt).
  return { id: app.id, name: app.name, apiKey: app.apiKey, rawApiSecret };
}

export async function revokeAppAction(appId: string) {
  const session = await auth();
  if (!session) {
    throw new Error("Unauthorized");
  }

  const app = await prisma.app.findFirst({
    where: { id: appId, agencyId: session.user.agencyId },
  });
  if (!app) {
    throw new Error("Applicazione non trovata");
  }

  await prisma.app.update({
    where: { id: app.id },
    data: { revokedAt: new Date() },
  });

  revalidatePath("/impostazioni/applicazioni");
}
