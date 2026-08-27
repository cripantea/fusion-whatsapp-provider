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
import { FacebookEmbeddedSignup } from "@/components/connections/facebook-embedded-signup";
import { prisma } from "@/lib/prisma";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  CONNECTED: "default",
  PENDING: "secondary",
  DISCONNECTED: "secondary",
  ERROR: "destructive",
};

export default async function ConnessioniPage() {
  const session = await auth();
  if (!session) {
    redirect("/login");
  }

  const t = await getTranslations("connections");
  const connections = await prisma.whatsappConnection.findMany({
    where: { tenantId: session.user.tenantId },
    orderBy: { createdAt: "desc" },
  });

  const appId = process.env.FACEBOOK_APP_ID ?? null;
  const configId = process.env.FACEBOOK_EMBEDDED_SIGNUP_CONFIG_ID ?? null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("embeddedSignup.title")}</CardTitle>
          <CardDescription>{t("embeddedSignup.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <FacebookEmbeddedSignup appId={appId} configId={configId} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("linkedNumbers.title")}</CardTitle>
          <CardDescription>{t("linkedNumbers.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("linkedNumbers.waba")}</TableHead>
                <TableHead>{t("linkedNumbers.phoneNumber")}</TableHead>
                <TableHead className="text-right">
                  {t("linkedNumbers.status")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {connections.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="h-24 text-center text-muted-foreground"
                  >
                    {t("linkedNumbers.empty")}
                  </TableCell>
                </TableRow>
              ) : (
                connections.map((connection) => (
                  <TableRow key={connection.id}>
                    <TableCell className="font-medium">
                      {connection.wabaId}
                    </TableCell>
                    <TableCell>{connection.displayPhoneNumber}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={STATUS_VARIANT[connection.status] ?? "secondary"}>
                        {t(`statusLabels.${connection.status}`)}
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
