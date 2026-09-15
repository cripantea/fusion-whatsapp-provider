import { getTranslations } from "next-intl/server";

import { StaggerChildren, StaggerItem, FadeUp } from "@/components/landing/motion";

const STEPS = ["embed", "connect", "communicate"] as const;

export async function HowItWorksSection() {
  const t = await getTranslations("landing.howItWorks");

  return (
    <section className="mx-auto max-w-6xl px-6 py-32">
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

      <StaggerChildren className="overflow-hidden rounded-2xl border bg-card">
        <div className="grid grid-cols-1 divide-y lg:grid-cols-3 lg:divide-x lg:divide-y-0">
          {STEPS.map((step, i) => (
            <StaggerItem key={step} className="flex flex-col gap-4 p-8">
              <div className="flex size-10 items-center justify-center rounded-full border border-primary/30 bg-primary/8 font-mono text-sm font-bold tabular-nums text-primary">
                {String(i + 1).padStart(2, "0")}
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="font-semibold tracking-tight">{t(`steps.${step}.title`)}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {t(`steps.${step}.description`)}
                </p>
              </div>
              <p className="mt-auto text-xs font-medium text-primary/60">{t(`steps.${step}.detail`)}</p>
            </StaggerItem>
          ))}
        </div>
      </StaggerChildren>
    </section>
  );
}
