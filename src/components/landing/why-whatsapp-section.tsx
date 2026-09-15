import { getTranslations } from "next-intl/server";

import { FadeUp, StaggerChildren, StaggerItem } from "@/components/landing/motion";

const STATS = [
  { key: "users", value: "2B+", sourceKey: "users" },
  { key: "italy", value: "#1",  sourceKey: "italy" },
] as const;

const SMS_REASONS = [
  "smsReason1",
  "smsReason2",
  "smsReason3",
  "smsReason4",
] as const;

const CLIENT_REASONS = [
  "clientReason1",
  "clientReason2",
  "clientReason3",
  "clientReason4",
] as const;

export async function WhyWhatsappSection() {
  const t = await getTranslations("landing.whyWhatsapp");

  return (
    <section className="border-y bg-muted/30">
      <div className="mx-auto max-w-6xl px-6 py-24">

        {/* Header */}
        <FadeUp className="mb-16 max-w-2xl">
          <p className="mb-4 text-sm font-medium text-muted-foreground">{t("sectionLabel")}</p>
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {t("titleMain")}
            <br />
            <span className="text-muted-foreground">{t("titleMuted")}</span>
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{t("subtitle")}</p>
        </FadeUp>

        {/* Verified stats */}
        <StaggerChildren className="mb-16 grid grid-cols-1 gap-px overflow-hidden rounded-xl border sm:grid-cols-2">
          {STATS.map((stat) => (
            <StaggerItem key={stat.key} className="flex flex-col gap-1 bg-background p-8">
              <span className="text-4xl font-semibold tracking-tight text-primary">{stat.value}</span>
              <span className="text-sm font-medium">{t(`stats.${stat.key}`)}</span>
              <span className="mt-1 text-xs text-muted-foreground/60">{t(`statSources.${stat.sourceKey}`)}</span>
            </StaggerItem>
          ))}
        </StaggerChildren>

        {/* Two columns */}
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">

          {/* SMS limitations */}
          <FadeUp className="flex flex-col gap-6">
            <div>
              <h3 className="mb-1 font-semibold tracking-tight">{t("smsCol.title")}</h3>
              <p className="text-sm text-muted-foreground">{t("smsCol.subtitle")}</p>
            </div>
            <ul className="flex flex-col gap-3">
              {SMS_REASONS.map((key) => (
                <li key={key} className="flex items-start gap-3 text-sm">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-xs font-bold text-destructive">✕</span>
                  <span className="text-muted-foreground">{t(`smsCol.${key}`)}</span>
                </li>
              ))}
            </ul>
            <div className="rounded-lg border bg-primary/5 p-4">
              <p className="text-sm font-medium text-primary">{t("smsCol.verdict")}</p>
            </div>
          </FadeUp>

          {/* Why clients want it */}
          <FadeUp className="flex flex-col gap-6">
            <div>
              <h3 className="mb-1 font-semibold tracking-tight">{t("clientCol.title")}</h3>
              <p className="text-sm text-muted-foreground">{t("clientCol.subtitle")}</p>
            </div>
            <ul className="flex flex-col gap-3">
              {CLIENT_REASONS.map((key) => (
                <li key={key} className="flex items-start gap-3 text-sm">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">✓</span>
                  <span className="text-muted-foreground">{t(`clientCol.${key}`)}</span>
                </li>
              ))}
            </ul>
          </FadeUp>

        </div>
      </div>
    </section>
  );
}
