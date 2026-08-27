import { MessageSquareText, Plug, Send, Users } from "lucide-react";
import { getTranslations } from "next-intl/server";

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

export default async function DashboardPage() {
  const t = await getTranslations("dashboard");

  const stats = [
    { key: "activeConnections", value: "0", icon: Plug },
    { key: "messagesSent", value: "0", icon: Send },
    { key: "contacts", value: "0", icon: Users },
    { key: "conversations", value: "0", icon: MessageSquareText },
  ] as const;

  const recentConnections = [
    { key: "primary" },
    { key: "support" },
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
                <TableHead>{t("recentConnections.name")}</TableHead>
                <TableHead className="text-right">
                  {t("recentConnections.status")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentConnections.map((connection) => (
                <TableRow key={connection.key}>
                  <TableCell className="font-medium">
                    {connection.key === "primary"
                      ? t("recentConnections.primaryNumber")
                      : t("recentConnections.supportNumber")}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="secondary">
                      {t("recentConnections.notConfigured")}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
