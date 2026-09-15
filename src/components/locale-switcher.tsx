"use client";

import { useTransition } from "react";
import { localeCookieName } from "@/i18n/config";

export function LocaleSwitcher({ locale }: { locale: string }) {
  const [isPending, startTransition] = useTransition();

  function switchLocale() {
    const next = locale === "it" ? "en" : "it";
    document.cookie = `${localeCookieName}=${next}; path=/; max-age=31536000; SameSite=Lax`;
    startTransition(() => {
      window.location.reload();
    });
  }

  return (
    <button
      onClick={switchLocale}
      disabled={isPending}
      className="rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground ring-1 ring-border transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
    >
      {locale === "it" ? "EN" : "IT"}
    </button>
  );
}
