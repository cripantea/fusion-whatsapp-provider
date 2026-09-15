import { getTranslations } from "next-intl/server";
import { X, Check } from "lucide-react";

import { FadeUp, StaggerChildren, StaggerItem } from "@/components/landing/motion";

export async function WhyFusionwaSection() {
  const t = await getTranslations("landing.whyFusionwa");

  const buildItems = [
    t("buildCol.items.0"),
    t("buildCol.items.1"),
    t("buildCol.items.2"),
    t("buildCol.items.3"),
    t("buildCol.items.4"),
    t("buildCol.items.5"),
    t("buildCol.items.6"),
  ];

  const fusionwaItems = [
    t("fusionwaCol.items.0"),
    t("fusionwaCol.items.1"),
    t("fusionwaCol.items.2"),
    t("fusionwaCol.items.3"),
    t("fusionwaCol.items.4"),
    t("fusionwaCol.items.5"),
    t("fusionwaCol.items.6"),
  ];

  return (
    <section className="relative border-y bg-muted/20">
      <div className="mx-auto max-w-6xl px-6 py-28">
        <FadeUp className="mb-16 max-w-xl">
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

        <StaggerChildren className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Build yourself */}
          <StaggerItem className="flex flex-col gap-5 rounded-2xl border bg-background p-8">
            <div>
              <h3 className="mb-1 font-semibold tracking-tight">{t("buildCol.title")}</h3>
              <p className="text-sm text-muted-foreground">{t("buildCol.subtitle")}</p>
            </div>
            <ul className="flex flex-col gap-3">
              {buildItems.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-[10px] font-bold text-destructive">
                    <X className="size-3" />
                  </span>
                  <span className="text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </StaggerItem>

          {/* With FusionWA */}
          <StaggerItem className="flex flex-col gap-5 rounded-2xl border border-primary/20 bg-background p-8">
            <div className="absolute inset-x-0 top-0 h-px rounded-t-2xl bg-gradient-to-r from-transparent via-primary to-transparent" />
            <div>
              <h3 className="mb-1 font-semibold tracking-tight">{t("fusionwaCol.title")}</h3>
              <p className="text-sm text-muted-foreground">{t("fusionwaCol.subtitle")}</p>
            </div>
            <ul className="flex flex-col gap-3">
              {fusionwaItems.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                    <Check className="size-3" />
                  </span>
                  <span className="text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </StaggerItem>
        </StaggerChildren>
      </div>
    </section>
  );
}
