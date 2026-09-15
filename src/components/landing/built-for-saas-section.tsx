import { getTranslations } from "next-intl/server";

import { FadeUp, StaggerChildren, StaggerItem } from "@/components/landing/motion";

const VERTICALS = [
  "crm",
  "booking",
  "property",
  "beauty",
  "hospitality",
  "healthcare",
  "automotive",
  "fitness",
] as const;

export async function BuiltForSaasSection() {
  const t = await getTranslations("landing.builtForSaas");

  return (
    <section className="mx-auto max-w-6xl px-6 py-32">
      <FadeUp className="mb-6 max-w-xl">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-primary/70">
          {t("sectionLabel")}
        </p>
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {t("titleMain")}
          <br />
          <span className="text-muted-foreground">{t("titleMuted")}</span>
        </h2>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{t("subtitle")}</p>
      </FadeUp>

      {/* Flow callout */}
      <FadeUp className="mb-12">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-medium text-primary">
          <span className="size-1.5 rounded-full bg-primary" />
          {t("flow")}
        </div>
      </FadeUp>

      <StaggerChildren className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {VERTICALS.map((key) => (
          <StaggerItem
            key={key}
            className="flex flex-col gap-2 rounded-xl border bg-card p-4 transition-colors hover:border-primary/20 hover:bg-primary/3"
          >
            <p className="text-sm font-semibold">{t(`verticals.${key}.label`)}</p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {t(`verticals.${key}.description`)}
            </p>
          </StaggerItem>
        ))}
      </StaggerChildren>
    </section>
  );
}
