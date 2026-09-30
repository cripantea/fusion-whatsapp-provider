import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { PUBLIC_SIGNUP_ENABLED } from "@/lib/growth-mode";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { FusionWALogo } from "@/components/fusionwa-logo";

export async function LandingHeader() {
  const t = await getTranslations("landing.nav");
  const locale = await getLocale();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-transparent bg-background/80 backdrop-blur-md transition-colors">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-6">
        <Link href="/" className="flex items-center">
          <FusionWALogo />
        </Link>

        <nav className="hidden flex-1 items-center gap-1 sm:flex">
          <Link
            href="/docs"
            className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            {t("docs")}
          </Link>
          <Link
            href="/#pricing"
            className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            {t("pricing")}
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-3">
          {/* API status indicator */}
          <span className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
            </span>
            API
          </span>

          <div className="hidden h-4 w-px bg-border sm:block" />

          <LocaleSwitcher locale={locale} />
          {PUBLIC_SIGNUP_ENABLED && (
            <Button
              size="sm"
              variant="ghost"
              className="hidden text-sm text-muted-foreground hover:text-foreground sm:inline-flex"
              nativeButton={false}
              render={<Link href="/register" />}
            >
              {t("register")}
            </Button>
          )}
          <Button
            size="sm"
            nativeButton={false}
            render={<Link href="/login" />}
          >
            {t("login")}
          </Button>
        </div>
      </div>
    </header>
  );
}
