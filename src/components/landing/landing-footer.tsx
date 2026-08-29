import Link from "next/link";
import { MessageSquareText } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { PUBLIC_SIGNUP_ENABLED } from "@/lib/growth-mode";

export async function LandingFooter() {
  const t = await getTranslations("landing.footer");
  const tApp = await getTranslations("app");

  const year = new Date().getFullYear();

  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-12 sm:flex-row sm:justify-between">
        <div className="flex max-w-sm flex-col gap-2">
          <div className="flex items-center gap-2 font-semibold">
            <MessageSquareText className="size-5 text-primary" />
            <span>{tApp("name")}</span>
          </div>
          <p className="text-sm text-muted-foreground">{t("tagline")}</p>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">{t("linksTitle")}</span>
          <Link
            href="/login"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            {t("login")}
          </Link>
          {PUBLIC_SIGNUP_ENABLED && (
            <Link
              href="/register"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              {t("register")}
            </Link>
          )}
          <Link
            href="/#pricing"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            {t("billing")}
          </Link>
        </div>
      </div>

      <div className="border-t px-4 py-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 text-xs text-muted-foreground">
          <p>{t("compliance")}</p>
          <p>
            © {year} {tApp("name")}. {t("rights")}
          </p>
        </div>
      </div>
    </footer>
  );
}
