import { redirect } from "next/navigation";
import { Link2, AppWindow, Users, TrendingUp } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { auth } from "@/auth";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { prisma } from "@/lib/prisma";
import { getCurrentTier, getMonthlyBill } from "@/lib/connection-tiers";
import { OnboardingChecklist } from "@/components/dashboard/onboarding-checklist";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  CONNECTED: "default",
  PENDING: "secondary",
  DISCONNECTED: "secondary",
  ERROR: "destructive",
};

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const t = await getTranslations("dashboard");
  const tConn = await getTranslations("connections");
  const agencyId = session.user.agencyId;

  const [sdkActive, appsCount, sdkUsersCount, recentConnections, agency] =
    await Promise.all([
      prisma.whatsappConnection.count({
        where: { status: "CONNECTED", appUser: { app: { agencyId } } },
      }),
      prisma.app.count({ where: { agencyId, revokedAt: null } }),
      prisma.appUser.count({ where: { app: { agencyId } } }),
      prisma.whatsappConnection.findMany({
        where: { appUser: { app: { agencyId } } },
        include: { appUser: { include: { app: true } } },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.agency.findUnique({
        where: { id: agencyId },
        select: { billingStatus: true, billingExempt: true },
      }),
    ]);

  const tier = getCurrentTier(sdkActive);
  const monthlyBill = getMonthlyBill(sdkActive);
  const billingReady = agency?.billingStatus === "READY";
  const billingExempt = agency?.billingExempt ?? false;

  const stats = [
    { key: "sdkConnections", value: String(sdkActive), icon: Link2 },
    { key: "apps", value: String(appsCount), icon: AppWindow },
    { key: "sdkUsers", value: String(sdkUsersCount), icon: Users },
    {
      key: "monthlyBill",
      value: billingExempt ? t("stats.exempt") : (monthlyBill === 0 ? t("stats.free") : `€${monthlyBill}`),
      icon: TrendingUp,
    },
  ] as const;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <OnboardingChecklist
        billingReady={billingReady}
        hasApps={appsCount > 0}
        hasConnections={sdkActive > 0}
        t={t}
      />

      {/* Tier badge */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">{t("currentTierLabel")}</span>
        <Badge variant="outline" className="font-semibold text-primary border-primary/40">
          {tier.label}
        </Badge>
        {tier.pricePerConnection > 0 && (
          <span className="text-xs text-muted-foreground">
            € {tier.pricePerConnection} / {t("perConnectionPerMonth")}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.key}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t(`stats.${stat.key}`)}
                </CardTitle>
                <Icon className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("recentConnections.title")}</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("recentConnections.app")}</TableHead>
                <TableHead>{t("recentConnections.customer")}</TableHead>
                <TableHead>{t("recentConnections.phoneNumber")}</TableHead>
                <TableHead className="text-right">{t("recentConnections.status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentConnections.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                    {t("recentConnections.empty")}
                  </TableCell>
                </TableRow>
              ) : (
                recentConnections.map((conn) => (
                  <TableRow key={conn.id}>
                    <TableCell className="font-medium">
                      {conn.appUser?.app.name ?? "—"}
                    </TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {conn.appUser?.externalCustomerId ?? "—"}
                    </TableCell>
                    <TableCell>{conn.displayPhoneNumber}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={STATUS_VARIANT[conn.status] ?? "secondary"}>
                        {tConn(`statusLabels.${conn.status}`)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
