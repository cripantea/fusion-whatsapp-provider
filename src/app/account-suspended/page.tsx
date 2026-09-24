import { MessageSquareText } from "lucide-react";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AdminLogoutButton } from "@/components/admin/admin-logout-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

export default async function AccountSuspendedPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const agency = await prisma.agency.findUnique({
    where: { id: session.user.agencyId },
    select: { billingStatus: true },
  });
  if (agency?.billingStatus !== "SUSPENDED") redirect("/dashboard");

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="mb-2 flex items-center gap-2 font-semibold"><MessageSquareText className="size-5 text-primary" />FusionWA</div>
          <CardTitle>Account sospeso</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">L’account è temporaneamente sospeso. Contatta l’assistenza FusionWA per maggiori informazioni.</p>
          <AdminLogoutButton />
        </CardContent>
      </Card>
    </main>
  );
}
