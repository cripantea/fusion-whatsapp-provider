import { prisma } from "@/lib/prisma";

function getSuperAdminEmails(): string[] {
  return (process.env.SUPERADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isSuperAdminEmail(email: string | null | undefined): boolean {
  if (!email) {
    return false;
  }
  return getSuperAdminEmails().includes(email.toLowerCase());
}

/**
 * @deprecated LEGACY — bypassa il gate maxConnections per le agenzie con staff superadmin.
 * Il nuovo modello usa Agency.platformLimitOverride (superadmin-only via setAgencyPlatformLimitOverrideAction).
 * Mantenuto perché alcune UI admin ancora lo referenziano; non usare in nuova business logic.
 */
export async function agencyHasSuperAdminUser(agencyId: string): Promise<boolean> {
  const emails = getSuperAdminEmails();
  if (emails.length === 0) {
    return false;
  }
  const count = await prisma.user.count({ where: { agencyId, email: { in: emails } } });
  return count > 0;
}
