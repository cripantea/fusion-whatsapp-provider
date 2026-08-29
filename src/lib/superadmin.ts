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
