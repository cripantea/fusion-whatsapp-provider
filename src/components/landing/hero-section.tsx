import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { PUBLIC_SIGNUP_ENABLED } from "@/lib/growth-mode";
import { HeroEntrance, FadeIn } from "@/components/landing/motion";

const SDK_SNIPPET = `<!-- 1. Load the widget -->
<script src="https://fusionwa.com/sdk/v1.js"></script>
<div id="wa-widget"></div>

<!-- 2. Initialize -->
<script>
  FusionWA.init({
    apiKey: "fwa_live_abc123",
    customerId: currentUser.id,
    containerId: "wa-widget",
  });
</script>`;

export async function HeroSection() {
  const t = await getTranslations("landing.hero");

  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 pt-20 text-center">

      {/* Dot grid background */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(oklch(0.741 0.176 158.6 / 0.18) 1px, transparent 1px)",
          backgroundSize: "30px 30px",
          maskImage:
            "radial-gradient(ellipse 80% 60% at 50% 0%, black 40%, transparent 100%)",
        }}
      />

      {/* Ambient glow top-center */}
      <div className="pointer-events-none absolute top-0 left-1/2 h-80 w-[700px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />

      <HeroEntrance className="relative flex flex-col items-center gap-6">

        {/* Badges */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border bg-background px-3.5 py-1 text-xs font-medium text-muted-foreground shadow-sm">
            <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
            {t("badge")}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/8 px-3.5 py-1 text-xs font-semibold text-primary shadow-sm">
            <svg viewBox="0 0 16 16" className="size-3 fill-current" aria-hidden>
              <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zm3.5 5.5-4 4.5-2-2L4 9.5l3.5 3.5 5-5.5L11.5 5.5z"/>
            </svg>
            {t("metaBadge")}
          </span>
        </div>

        <h1 className="max-w-3xl text-balance text-5xl font-semibold tracking-tighter sm:text-6xl lg:text-7xl">
          {t("title")}
        </h1>

        <p className="max-w-lg text-balance text-lg text-muted-foreground">
          {t("subtitle")}
        </p>

        <div className="flex flex-col items-center gap-3 sm:flex-row">
          {PUBLIC_SIGNUP_ENABLED ? (
            <>
              <Button
                size="lg"
                className="px-8 shadow-lg shadow-primary/25"
                nativeButton={false}
                render={<Link href="/register" />}
              >
                {t("ctaPrimary")}
              </Button>
              <Button
                size="lg"
                variant="ghost"
                className="text-muted-foreground"
                nativeButton={false}
                render={<Link href="/docs" />}
              >
                {t("ctaSecondary")}
              </Button>
            </>
          ) : (
            <Button
              size="lg"
              className="px-8 shadow-lg shadow-primary/25"
              nativeButton={false}
              render={<Link href="/login" />}
            >
              {t("ctaPlatform")}
            </Button>
          )}
        </div>

        <p className="text-xs text-muted-foreground/70">{t("trustLine")}</p>

      </HeroEntrance>

      {/* Code block with green glow */}
      <FadeIn delay={0.4} className="relative mt-16 w-full max-w-2xl">
        <div className="pointer-events-none absolute -inset-6 rounded-3xl bg-primary/6 blur-2xl" />
        <div className="relative overflow-hidden rounded-xl border border-white/5 bg-zinc-950 text-left shadow-2xl">
          <div className="flex items-center gap-1.5 border-b border-white/8 bg-zinc-900/60 px-4 py-3">
            <span className="size-2.5 rounded-full bg-red-500/70" />
            <span className="size-2.5 rounded-full bg-yellow-500/70" />
            <span className="size-2.5 rounded-full bg-green-500/70" />
            <span className="ml-3 text-xs text-zinc-500">index.html</span>
          </div>
          <pre className="overflow-x-auto p-4 text-xs leading-relaxed text-zinc-300 sm:p-5 sm:text-sm">
            <code>
              {SDK_SNIPPET.split("\n").map((line, i) => {
                if (line.startsWith("<!--")) {
                  return <span key={i} className="text-zinc-600">{line}{"\n"}</span>;
                }
                if (line.includes("FusionWA.init")) {
                  return <span key={i} className="font-semibold text-white">{line}{"\n"}</span>;
                }
                if (line.includes("apiKey:") || line.includes("customerId:") || line.includes("containerId:")) {
                  const colon = line.indexOf(":");
                  return (
                    <span key={i}>
                      <span className="text-zinc-400">{line.slice(0, colon)}:</span>
                      <span className="text-emerald-400">{line.slice(colon + 1)}</span>
                      {"\n"}
                    </span>
                  );
                }
                return <span key={i} className="text-zinc-400">{line}{"\n"}</span>;
              })}
            </code>
          </pre>
        </div>
      </FadeIn>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
}
