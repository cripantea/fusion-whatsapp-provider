import { cookies } from "next/headers";
import { cache } from "react";

import { prisma } from "@/lib/prisma";

export const ACTIVE_TENANT_COOKIE = "ACTIVE_TENANT_ID";

async function listAgencyTenants(agencyId: string) {
  const tenants = await prisma.tenant.findMany({
    where: { agencyId },
    orderBy: { createdAt: "asc" },
  });

  if (tenants.length > 0) {
    return tenants;
  }

  // Ogni agency deve avere sempre almeno un workspace-cliente disponibile:
  // se non ne esiste ancora nessuno (es. subito dopo la registrazione), ne creiamo uno di default.
  const created = await prisma.tenant.create({
    data: { agencyId, name: "Workspace principale" },
  });
  return [created];
}

async function resolveActiveTenant<T extends { id: string }>(tenants: T[]): Promise<T> {
  const cookieStore = await cookies();
  const cookieTenantId = cookieStore.get(ACTIVE_TENANT_COOKIE)?.value;
  const match = tenants.find((tenant) => tenant.id === cookieTenantId);
  return match ?? tenants[0];
}

// cache() deduplica la query per la durata di una singola request: layout, header
// e pagina possono chiamarla senza generare query duplicate verso il DB.
export const getWorkspaceContext = cache(async (agencyId: string) => {
  const tenants = await listAgencyTenants(agencyId);
  const activeTenant = await resolveActiveTenant(tenants);
  return { tenants, activeTenant };
});

export async function assertTenantOwnedByAgency(tenantId: string, agencyId: string) {
  return prisma.tenant.findFirst({ where: { id: tenantId, agencyId } });
}
