import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";

export async function HeroSection() {
  const t = await getTranslations("landing.hero");

  return (
    <section className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-4 py-20 text-center sm:py-28">
      <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
        {t("title")}
      </h1>
      <p className="max-w-xl text-lg text-muted-foreground text-balance">
        {t("subtitle")}
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button size="lg" nativeButton={false} render={<Link href="/register" />}>
          {t("ctaPrimary")}
        </Button>
        <Button
          size="lg"
          variant="outline"
          nativeButton={false}
          render={<Link href="/login" />}
        >
          {t("ctaSecondary")}
        </Button>
      </div>
    </section>
  );
}
