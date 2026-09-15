import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { PUBLIC_SIGNUP_ENABLED } from "@/lib/growth-mode";
import { HeroEntrance, FadeIn } from "@/components/landing/motion";

const SDK_SNIPPET = `<!-- 1. Load the widget -->
<script src="https://fusionwa.io/sdk/v1.js"></script>
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
    <section className="relative flex min-h-screen flex-col items-center justify-center px-6 pt-14 text-center">
      <HeroEntrance className="flex flex-col items-center gap-6">
        <div className="inline-flex items-center gap-2 rounded-full border bg-muted/50 px-3.5 py-1 text-xs font-medium text-muted-foreground">
          <span className="size-1.5 rounded-full bg-emerald-500" />
          {t("badge")}
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
              <Button size="lg" className="px-8" nativeButton={false} render={<Link href="/register" />}>
                {t("ctaPrimary")}
              </Button>
              <Button size="lg" variant="ghost" className="text-muted-foreground" nativeButton={false} render={<Link href="/docs" />}>
                {t("ctaSecondary")}
              </Button>
            </>
          ) : (
            <Button size="lg" className="px-8" nativeButton={false} render={<Link href="/login" />}>
              {t("ctaPlatform")}
            </Button>
          )}
        </div>
      </HeroEntrance>

      <FadeIn delay={0.4} className="mt-16 w-full max-w-2xl">
        <div className="overflow-hidden rounded-xl border bg-zinc-950 text-left shadow-2xl">
          <div className="flex items-center gap-1.5 border-b border-white/10 px-4 py-3">
            <span className="size-2.5 rounded-full bg-red-500/80" />
            <span className="size-2.5 rounded-full bg-yellow-500/80" />
            <span className="size-2.5 rounded-full bg-green-500/80" />
            <span className="ml-3 text-xs text-zinc-500">index.html</span>
          </div>
          <pre className="overflow-x-auto p-4 text-xs leading-relaxed text-zinc-300 sm:p-5 sm:text-sm">
            <code>
              {SDK_SNIPPET.split("\n").map((line, i) => {
                if (line.startsWith("<!--")) {
                  return <span key={i} className="text-zinc-500">{line}{"\n"}</span>;
                }
                if (line.includes("FusionWA.init")) {
                  return <span key={i} className="text-white font-medium">{line}{"\n"}</span>;
                }
                if (line.includes("apiKey:") || line.includes("customerId:") || line.includes("containerId:")) {
                  const parts = line.split(":");
                  return (
                    <span key={i}>
                      <span className="text-zinc-400">{parts[0]}:</span>
                      <span className="text-emerald-400">{parts.slice(1).join(":")}</span>
                      {"\n"}
                    </span>
                  );
                }
                return <span key={i} className="text-zinc-300">{line}{"\n"}</span>;
              })}
            </code>
          </pre>
        </div>
      </FadeIn>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
}
