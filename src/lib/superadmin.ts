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

// Un'agenzia il cui staff include un'email superadmin ha licenze illimitate:
// bypassa completamente il controllo di countAgencyConnections vs maxConnections.
export async function agencyHasSuperAdminUser(agencyId: string): Promise<boolean> {
  const emails = getSuperAdminEmails();
  if (emails.length === 0) {
    return false;
  }
  const count = await prisma.user.count({ where: { agencyId, email: { in: emails } } });
  return count > 0;
}
