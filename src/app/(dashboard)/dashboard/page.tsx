import { redirect } from "next/navigation";
import { MessageSquareText, Plug, AppWindow, Users } from "lucide-react";
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

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  CONNECTED: "default",
  PENDING: "secondary",
  DISCONNECTED: "secondary",
  ERROR: "destructive",
};

export default async function DashboardPage() {
  const session = await auth();
  if (!session) {
    redirect("/login");
  }

  const t = await getTranslations("dashboard");
  const tConn = await getTranslations("connections");
  const agencyId = session.user.agencyId;

  const [directActive, sdkActive, appsCount, sdkUsersCount, recentConnections] =
    await Promise.all([
      prisma.whatsappConnection.count({
        where: { status: "CONNECTED", tenant: { agencyId } },
      }),
      prisma.whatsappConnection.count({
        where: { status: "CONNECTED", appUser: { app: { agencyId } } },
      }),
      prisma.app.count({ where: { agencyId, revokedAt: null } }),
      prisma.appUser.count({ where: { app: { agencyId } } }),
      prisma.whatsappConnection.findMany({
        where: { tenant: { agencyId } },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

  const stats = [
    { key: "directConnections", value: String(directActive), icon: Plug },
    { key: "sdkConnections", value: String(sdkActive), icon: MessageSquareText },
    { key: "apps", value: String(appsCount), icon: AppWindow },
    { key: "sdkUsers", value: String(sdkUsersCount), icon: Users },
  ] as const;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
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
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("recentConnections.phoneNumber")}</TableHead>
                <TableHead>{t("recentConnections.wabaId")}</TableHead>
                <TableHead className="text-right">{t("recentConnections.status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentConnections.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                    {t("recentConnections.empty")}
                  </TableCell>
                </TableRow>
              ) : (
                recentConnections.map((conn) => (
                  <TableRow key={conn.id}>
                    <TableCell className="font-medium">{conn.displayPhoneNumber}</TableCell>
                    <TableCell className="text-muted-foreground">{conn.wabaId}</TableCell>
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
        </CardContent>
      </Card>
    </div>
  );
}
