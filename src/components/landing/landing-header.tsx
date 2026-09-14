import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { PUBLIC_SIGNUP_ENABLED } from "@/lib/growth-mode";

export async function LandingHeader() {
  const t = await getTranslations("landing.nav");

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-transparent bg-background/80 backdrop-blur-md transition-colors">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-6">
        <Link href="/" className="text-sm font-semibold tracking-tight">
          FusionWA
        </Link>

        <nav className="flex flex-1 items-center gap-1">
          <Link
            href="/docs"
            className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Docs
          </Link>
          <Link
            href="/#pricing"
            className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Prezzi
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          {PUBLIC_SIGNUP_ENABLED && (
            <Button
              size="sm"
              variant="ghost"
              className="text-sm text-muted-foreground hover:text-foreground"
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
