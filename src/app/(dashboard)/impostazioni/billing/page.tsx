import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StripeActionButton } from "@/components/billing/stripe-action-button";
import { PAID_PLAN_TYPES, PLAN_MAX_CONNECTIONS } from "@/lib/plans";
import { prisma } from "@/lib/prisma";

export default async function BillingPage() {
  const session = await auth();
  if (!session) {
    redirect("/login");
  }

  const t = await getTranslations("settings.billing");

  const agency = await prisma.agency.findUnique({ where: { id: session.user.agencyId } });
  if (!agency) {
    redirect("/dashboard");
  }

  const currentConnections = await prisma.whatsappConnection.count({
    where: { tenant: { agencyId: agency.id } },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("currentPlan.title")}</CardTitle>
          <CardDescription>{t("currentPlan.description")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:max-w-md">
          <div className="flex items-center gap-2">
            <Badge>{t(`planLabels.${agency.planType}`)}</Badge>
            <Badge variant={agency.subscriptionStatus === "ACTIVE" ? "default" : "secondary"}>
              {t(`statusLabels.${agency.subscriptionStatus}`)}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {t("connectionsUsage", {
              used: currentConnections,
              max: agency.maxConnections,
            })}
          </p>
          {agency.stripeCustomerId && (
            <StripeActionButton
              endpoint="/api/stripe/portal"
              label={t("managePlan")}
              loadingLabel={t("redirecting")}
              variant="outline"
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("plans.title")}</CardTitle>
          <CardDescription>{t("plans.description")}</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {PAID_PLAN_TYPES.map((plan) => {
            const isCurrentPlan = agency.planType === plan;
            return (
              <div key={plan} className="flex flex-col gap-3 rounded-lg border p-4">
                <div>
                  <p className="font-medium">{t(`planLabels.${plan}`)}</p>
                  <p className="text-sm text-muted-foreground">
                    {t("maxConnections", { max: PLAN_MAX_CONNECTIONS[plan] })}
                  </p>
                </div>
                <StripeActionButton
                  endpoint="/api/stripe/checkout"
                  body={{ planType: plan }}
                  label={
                    isCurrentPlan
                      ? t("currentPlanLabel")
                      : t("upgradeTo", { plan: t(`planLabels.${plan}`) })
                  }
                  loadingLabel={t("redirecting")}
                  variant={isCurrentPlan ? "outline" : "default"}
                />
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
