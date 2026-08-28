import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { ApplicationsManager } from "@/components/applications/applications-manager";
import { prisma } from "@/lib/prisma";

export default async function ApplicazioniPage() {
  const session = await auth();
  if (!session) {
    redirect("/login");
  }

  const t = await getTranslations("settings.applications");

  const agency = await prisma.agency.findUnique({ where: { id: session.user.agencyId } });
  if (!agency) {
    redirect("/dashboard");
  }

  const apps = await prisma.app.findMany({
    where: { agencyId: agency.id },
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { appUsers: true } } },
  });

  const appsWithStats = await Promise.all(
    apps.map(async (app) => ({
      id: app.id,
      name: app.name,
      apiKey: app.apiKey,
      revoked: app.revokedAt !== null,
      customersCount: app._count.appUsers,
      connectedCount: await prisma.whatsappConnection.count({
        where: { appUser: { appId: app.id }, status: "CONNECTED" },
      }),
    }))
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <ApplicationsManager apps={appsWithStats} maxConnections={agency.maxConnections} />
    </div>
  );
}
