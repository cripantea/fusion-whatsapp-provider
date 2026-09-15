import Link from "next/link";
import { Check } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { PLAN_MAX_CONNECTIONS } from "@/lib/plans";
import { PUBLIC_SIGNUP_ENABLED } from "@/lib/growth-mode";
import { StaggerChildren, StaggerItem, FadeUp } from "@/components/landing/motion";

const PLANS = [
  { key: "DEVELOPER" as const, name: "Developer", price: "$0", highlighted: false },
  { key: "TEAM" as const, name: "Team", price: "$29", highlighted: false },
  { key: "AGENCY" as const, name: "Agency", price: "$79", highlighted: true },
  { key: "ENTERPRISE" as const, name: "Enterprise", price: "$199", highlighted: false },
] as const;

export async function PricingTable() {
  const t = await getTranslations("landing.pricing");

  return (
    <section id="pricing" className="mx-auto max-w-6xl px-6 py-32">
      <FadeUp className="mb-16 max-w-md">
        <p className="mb-4 text-sm font-medium text-muted-foreground">{t("sectionLabel")}</p>
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {t("titleMain")}
          <br />
          <span className="text-muted-foreground">{t("titleMuted")}</span>
        </h2>
      </FadeUp>

      <StaggerChildren className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PLANS.map((plan) => (
          <StaggerItem key={plan.key}>
            <div
              className={`flex h-full flex-col rounded-xl border p-6 ${
                plan.highlighted
                  ? "border-foreground bg-foreground text-background"
                  : "bg-card"
              }`}
            >
              <div className="mb-6">
                {plan.highlighted && (
                  <p className="mb-3 text-xs font-medium uppercase tracking-widest opacity-60">
                    {t("mostPopular")}
                  </p>
                )}
                <p className="mb-1 font-semibold">{plan.name}</p>
                <p className={`mb-3 text-sm ${plan.highlighted ? "opacity-70" : "text-muted-foreground"}`}>
                  {t(`plans.${plan.key}.description`)}
                </p>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-semibold tracking-tight">{plan.price}</span>
                  <span className={`text-sm ${plan.highlighted ? "opacity-60" : "text-muted-foreground"}`}>
                    {t("perMonth")}
                  </span>
                </div>
              </div>

              <div className="mb-8 flex flex-1 flex-col gap-2.5">
                {[
                  t("upToConnections", { count: PLAN_MAX_CONNECTIONS[plan.key] }),
                  t("sdkIncluded"),
                  t("apiAndWebhook"),
                  t("coexistenceIncluded"),
                ].map((feat) => (
                  <div key={feat} className="flex items-center gap-2 text-sm">
                    <Check className={`size-3.5 shrink-0 ${plan.highlighted ? "opacity-80" : "text-foreground"}`} />
                    <span className={plan.highlighted ? "opacity-80" : "text-muted-foreground"}>
                      {feat}
                    </span>
                  </div>
                ))}
              </div>

              <Button
                className="w-full"
                variant={plan.highlighted ? "secondary" : "outline"}
                nativeButton={false}
                render={
                  <Link href={PUBLIC_SIGNUP_ENABLED ? `/register?plan=${plan.key}` : "/login"} />
                }
              >
                {plan.key === "DEVELOPER" && PUBLIC_SIGNUP_ENABLED
                  ? t("ctaFree")
                  : PUBLIC_SIGNUP_ENABLED
                  ? t("ctaPlan")
                  : t("ctaLogin")}
              </Button>
            </div>
          </StaggerItem>
        ))}
      </StaggerChildren>
    </section>
  );
}
