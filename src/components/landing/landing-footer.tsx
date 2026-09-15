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

        <div className="flex flex-wrap gap-10 sm:gap-12">
          <div className="flex flex-col gap-3">
            <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              {t("productTitle")}
            </span>
            <Link href="/docs" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              {t("docs")}
            </Link>
            <Link href="/#pricing" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              {t("pricing")}
            </Link>
            {PUBLIC_SIGNUP_ENABLED && (
              <Link href="/register" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                {t("register")}
              </Link>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              {t("solutionsTitle")}
            </span>
            <Link href="/saas" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              {t("saas")}
            </Link>
            <Link href="/software-houses" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              {t("softwareHouses")}
            </Link>
          </div>

          <div className="flex flex-col gap-3">
            <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              {t("accountTitle")}
            </span>
            <Link href="/login" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              {t("login")}
            </Link>
            <Link href="/docs" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              {t("sdkGuide")}
            </Link>
            <Link href="/llms.txt" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
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
