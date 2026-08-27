"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { ACTIVE_TENANT_COOKIE, assertTenantOwnedByAgency } from "@/lib/active-tenant";
import { prisma } from "@/lib/prisma";

const ACTIVE_TENANT_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export async function switchWorkspaceAction(tenantId: string) {
  const session = await auth();
  if (!session) {
    throw new Error("Unauthorized");
  }

  const tenant = await assertTenantOwnedByAgency(tenantId, session.user.agencyId);
  if (!tenant) {
    throw new Error("Workspace non trovato");
  }

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_TENANT_COOKIE, tenant.id, {
    path: "/",
    maxAge: ACTIVE_TENANT_COOKIE_MAX_AGE,
    sameSite: "lax",
  });

  revalidatePath("/", "layout");
}

export async function createWorkspaceAction(name: string) {
  const session = await auth();
  if (!session) {
    throw new Error("Unauthorized");
  }

  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new Error("Nome workspace obbligatorio");
  }

  const tenant = await prisma.tenant.create({
    data: { name: trimmedName, agencyId: session.user.agencyId },
  });

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_TENANT_COOKIE, tenant.id, {
    path: "/",
    maxAge: ACTIVE_TENANT_COOKIE_MAX_AGE,
    sameSite: "lax",
  });

  revalidatePath("/", "layout");
}
