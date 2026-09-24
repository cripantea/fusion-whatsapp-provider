import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
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

  // Billing setup obbligatorio prima di accedere alla dashboard.
  // /onboarding/billing è fuori dal route group (dashboard) → nessun loop.
  const agency = await prisma.agency.findUnique({
    where: { id: session.user.agencyId },
    select: { billingSetupCompletedAt: true, billingStatus: true },
  });
  if (agency?.billingStatus === "SUSPENDED") {
    redirect("/account-suspended");
  }
  if (!agency?.billingSetupCompletedAt) {
    redirect("/onboarding/billing");
  }

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
