import { Building2, ShieldCheck, Smartphone, Zap } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const FEATURES = [
  { key: "coexistence", icon: Smartphone },
  { key: "webhook", icon: Zap },
  { key: "multitenant", icon: Building2 },
  { key: "noStorage", icon: ShieldCheck },
] as const;

export async function FeatureCards() {
  const t = await getTranslations("landing.features");

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
      <h2 className="mb-10 text-center text-2xl font-semibold tracking-tight sm:text-3xl">
        {t("title")}
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((feature) => {
          const Icon = feature.icon;
          return (
            <Card key={feature.key}>
              <CardHeader>
                <Icon className="size-6 text-primary" />
                <CardTitle className="mt-2 text-base">
                  {t(`${feature.key}.title`)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {t(`${feature.key}.description`)}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
