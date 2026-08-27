import Link from "next/link";
import { Check } from "lucide-react";
import { getTranslations } from "next-intl/server";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PLAN_MAX_CONNECTIONS } from "@/lib/plans";

const PLANS = [
  { key: "DEVELOPER" as const, price: "$0", highlighted: false },
  { key: "TEAM" as const, price: "$29", highlighted: false },
  { key: "AGENCY" as const, price: "$79", highlighted: true },
  { key: "ENTERPRISE" as const, price: "$199", highlighted: false },
];

export async function PricingTable() {
  const t = await getTranslations("landing.pricing");
  const tPlans = await getTranslations("settings.billing.planLabels");

  return (
    <section id="pricing" className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
      <div className="mb-10 text-center">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {t("title")}
        </h2>
        <p className="mt-2 text-muted-foreground">{t("subtitle")}</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PLANS.map((plan) => (
          <Card
            key={plan.key}
            className={plan.highlighted ? "border-primary shadow-md" : undefined}
          >
            <CardHeader>
              {plan.highlighted && (
                <Badge className="mb-2 w-fit">{t("mostPopular")}</Badge>
              )}
              <CardTitle>{tPlans(plan.key)}</CardTitle>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-semibold">{plan.price}</span>
                <span className="text-sm text-muted-foreground">/mo</span>
              </div>
            </CardHeader>
            <CardContent>
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Check className="size-4 text-primary" />
                {t("upToConnections", { count: PLAN_MAX_CONNECTIONS[plan.key] })}
              </p>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                variant={plan.highlighted ? "default" : "outline"}
                nativeButton={false}
                render={<Link href={`/register?plan=${plan.key}`} />}
              >
                {plan.key === "DEVELOPER" ? t("ctaFree") : t("cta")}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </section>
  );
}
