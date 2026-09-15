import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { PUBLIC_SIGNUP_ENABLED } from "@/lib/growth-mode";

export async function LandingFooter() {
  const t = await getTranslations("landing.footer");
  const year = new Date().getFullYear();

  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-12 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-3">
          <span className="text-sm font-semibold">FusionWA</span>
          <p className="max-w-xs text-sm text-muted-foreground">{t("tagline")}</p>
        </div>

        <div className="flex gap-12">
          <div className="flex flex-col gap-3">
            <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              {t("productTitle")}
            </span>
            <Link href="/docs" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {t("docs")}
            </Link>
            <Link href="/#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {t("pricing")}
            </Link>
            {PUBLIC_SIGNUP_ENABLED && (
              <Link href="/register" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                {t("register")}
              </Link>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              {t("accountTitle")}
            </span>
            <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {t("login")}
            </Link>
            <Link href="/docs" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {t("sdkGuide")}
            </Link>
            <Link href="/llms.txt" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {t("llmsTxt")}
            </Link>
          </div>
        </div>
      </div>

      <div className="border-t px-6 py-5">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <p className="text-xs text-muted-foreground">
            © {year} FusionWA. {t("rights")}
          </p>
          <p className="max-w-lg text-right text-xs text-muted-foreground">
            {t("disclaimer")}
          </p>
        </div>
      </div>
    </footer>
  );
}
