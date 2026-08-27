import Link from "next/link";
import { MessageSquareText } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

export async function LandingHeader() {
  const t = await getTranslations("landing.nav");
  const tApp = await getTranslations("app");
  const tHeader = await getTranslations("header");

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:px-6">
      <Link href="/" className="flex items-center gap-2 font-semibold">
        <MessageSquareText className="size-5 text-primary" />
        <span>{tApp("name")}</span>
      </Link>

      <div className="flex-1" />

      <ThemeToggle label={tHeader("toggleTheme")} />
      <Button variant="ghost" nativeButton={false} render={<Link href="/login" />}>
        {t("login")}
      </Button>
      <Button nativeButton={false} render={<Link href="/register" />}>
        {t("register")}
      </Button>
    </header>
  );
}
