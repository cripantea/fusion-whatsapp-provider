import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { getWorkspaceContext } from "@/lib/active-tenant";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) {
    redirect("/login");
  }

  const { tenants, activeTenant } = await getWorkspaceContext(session.user.agencyId);

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar tenants={tenants} activeTenantId={activeTenant.id} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header tenants={tenants} activeTenantId={activeTenant.id} />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
