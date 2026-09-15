import Link from "next/link";
import { Check } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { PUBLIC_SIGNUP_ENABLED } from "@/lib/growth-mode";
import { StaggerChildren, StaggerItem, FadeUp } from "@/components/landing/motion";

const TIERS = [
  { key: "FREE" as const,    connections: "1–10",  price: "€0",  pricePerConnection: null, highlighted: false },
  { key: "STARTER" as const, connections: "11–25", price: "€5",  pricePerConnection: 5,    highlighted: true  },
  { key: "SCALE" as const,   connections: "26+",   price: "€3",  pricePerConnection: 3,    highlighted: false },
] as const;

export async function PricingTable() {
  const t = await getTranslations("landing.pricing");

  return (
    <section id="pricing" className="mx-auto max-w-6xl px-6 py-32">
      <FadeUp className="mb-16 max-w-xl">
        <p className="mb-4 text-sm font-medium text-muted-foreground">{t("sectionLabel")}</p>
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {t("titleMain")}
          <br />
          <span className="text-muted-foreground">{t("titleMuted")}</span>
        </h2>
        <p className="mt-4 text-sm text-muted-foreground">{t("subtitle")}</p>
      </FadeUp>

      <StaggerChildren className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {TIERS.map((tier) => (
          <StaggerItem key={tier.key}>
            <div
              className={`flex h-full flex-col rounded-xl border p-6 ${
                tier.highlighted
                  ? "border-foreground bg-foreground text-background"
                  : "bg-card"
              }`}
            >
              <div className="mb-6">
                {tier.highlighted && (
                  <p className="mb-3 text-xs font-medium uppercase tracking-widest opacity-60">
                    {t("mostPopular")}
                  </p>
                )}
                <p className="mb-1 font-semibold">{t(`tiers.${tier.key}.name`)}</p>
                <p className={`mb-3 text-sm ${tier.highlighted ? "opacity-70" : "text-muted-foreground"}`}>
                  {t(`tiers.${tier.key}.description`)}
                </p>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-semibold tracking-tight">{tier.price}</span>
                  <span className={`text-sm ${tier.highlighted ? "opacity-60" : "text-muted-foreground"}`}>
                    {tier.pricePerConnection !== null
                      ? t("perConnectionPerMonth")
                      : t("forever")}
                  </span>
                </div>
              </div>

              <div className="mb-8 flex flex-1 flex-col gap-2.5">
                {([
                  t("features.connections", { range: tier.connections }),
                  t("features.sdkIncluded"),
                  t("features.apiAndWebhook"),
                  t("features.coexistenceIncluded"),
                ] as string[]).map((feat) => (
                  <div key={feat} className="flex items-center gap-2 text-sm">
                    <Check className={`size-3.5 shrink-0 ${tier.highlighted ? "opacity-80" : "text-foreground"}`} />
                    <span className={tier.highlighted ? "opacity-80" : "text-muted-foreground"}>
                      {feat}
                    </span>
                  </div>
                ))}
              </div>

              <Button
                className="w-full"
                variant={tier.highlighted ? "secondary" : "outline"}
                nativeButton={false}
                render={<Link href={PUBLIC_SIGNUP_ENABLED ? "/register" : "/login"} />}
              >
                {tier.key === "FREE" && PUBLIC_SIGNUP_ENABLED
                  ? t("ctaFree")
                  : PUBLIC_SIGNUP_ENABLED
                  ? t("ctaStart")
                  : t("ctaLogin")}
              </Button>
            </div>
          </StaggerItem>
        ))}
      </StaggerChildren>

      <FadeUp className="mt-12 text-center">
        <p className="text-sm text-muted-foreground">{t("noSubscriptionNote")}</p>
      </FadeUp>
    </section>
  );
}
