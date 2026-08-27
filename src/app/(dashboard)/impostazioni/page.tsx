import Link from "next/link";
import { getTranslations } from "next-intl/server";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function ImpostazioniPage() {
  const t = await getTranslations("settings");
  const tHeader = await getTranslations("header");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("workspace.title")}</CardTitle>
          <CardDescription>{t("workspace.description")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:max-w-md">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="workspace-name" className="text-sm font-medium">
              {t("workspace.nameLabel")}
            </label>
            <Input
              id="workspace-name"
              placeholder={t("workspace.namePlaceholder")}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="workspace-email" className="text-sm font-medium">
              {t("workspace.emailLabel")}
            </label>
            <Input
              id="workspace-email"
              type="email"
              placeholder={t("workspace.emailPlaceholder")}
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button>{t("workspace.save")}</Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("billing.title")}</CardTitle>
          <CardDescription>{t("billing.subtitle")}</CardDescription>
        </CardHeader>
        <CardFooter>
          <Button render={<Link href="/impostazioni/billing" />}>
            {t("billing.manageLink")}
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("appearance.title")}</CardTitle>
          <CardDescription>{t("appearance.description")}</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between sm:max-w-md">
          <span className="text-sm text-muted-foreground">
            {t("appearance.themeLabel")}
          </span>
          <ThemeToggle label={tHeader("toggleTheme")} />
        </CardContent>
      </Card>
    </div>
  );
}
