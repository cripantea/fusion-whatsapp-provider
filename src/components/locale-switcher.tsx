"use client";

import { useTransition } from "react";
import { localeCookieName } from "@/i18n/config";

const FLAGS: Record<string, string> = {
  it: "🇮🇹",
  en: "🇬🇧",
};

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
      title={locale === "it" ? "Switch to English" : "Passa all'italiano"}
      className="flex size-8 items-center justify-center rounded-full text-base transition-opacity hover:opacity-70 disabled:opacity-30"
    >
      {FLAGS[locale]}
    </button>
  );
}
