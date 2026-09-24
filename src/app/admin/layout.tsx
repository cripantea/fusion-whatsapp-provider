import Link from "next/link";
import { MessageSquareText } from "lucide-react";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { isSuperAdminEmail } from "@/lib/superadmin";
import { AdminLogoutButton } from "@/components/admin/admin-logout-button";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) {
    redirect("/login");
  }
  if (!isSuperAdminEmail(session.user.email)) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen w-full flex-col">
      <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <Link href="/admin" className="flex items-center gap-2 font-semibold">
          <MessageSquareText className="size-5 text-primary" />
          <span>FusionWA Admin</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link href="/admin/utenti" className="rounded-md px-3 py-2 text-muted-foreground hover:bg-muted hover:text-foreground">
            Utenti
          </Link>
          <Link href="/admin" className="rounded-md px-3 py-2 text-muted-foreground hover:bg-muted hover:text-foreground">
            Connessioni
          </Link>
        </nav>
        <div className="flex-1" />
        <AdminLogoutButton />
      </header>
      <main className="flex-1 p-4 md:p-6">{children}</main>
    </div>
  );
}
