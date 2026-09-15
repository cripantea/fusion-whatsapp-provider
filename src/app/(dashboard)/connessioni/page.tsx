import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import {
  Card,
  CardContent,
  CardDescription,
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

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  CONNECTED: "default",
  PENDING: "secondary",
  DISCONNECTED: "secondary",
  ERROR: "destructive",
};

export default async function ConnessioniPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const t = await getTranslations("connections");
  const agencyId = session.user.agencyId;

  const [connections, totalActive] = await Promise.all([
    prisma.whatsappConnection.findMany({
      where: { appUser: { app: { agencyId } } },
      include: {
        appUser: { include: { app: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.whatsappConnection.count({
      where: { status: "CONNECTED", appUser: { app: { agencyId } } },
    }),
  ]);

  const tier = getCurrentTier(totalActive);
  const monthlyBill = getMonthlyBill(totalActive);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      {/* Tier summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("tierCard.activeConnections")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalActive}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("tierCard.currentTier")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tier.label}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("tierCard.monthlyEstimate")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {monthlyBill === 0 ? t("tierCard.free") : `€${monthlyBill}`}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("sdkConnections.title")}</CardTitle>
          <CardDescription>{t("sdkConnections.description")}</CardDescription>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("sdkConnections.app")}</TableHead>
                <TableHead>{t("sdkConnections.customer")}</TableHead>
                <TableHead>{t("sdkConnections.phoneNumber")}</TableHead>
                <TableHead className="text-right">{t("sdkConnections.status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {connections.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                    {t("sdkConnections.empty")}
                  </TableCell>
                </TableRow>
              ) : (
                connections.map((conn) => (
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
                        {t(`statusLabels.${conn.status}`)}
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
