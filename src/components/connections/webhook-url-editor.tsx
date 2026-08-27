"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type SaveStatus = "idle" | "saving" | "saved" | "error";

export function WebhookUrlEditor({
  connectionId,
  initialUrl,
}: {
  connectionId: string;
  initialUrl: string | null;
}) {
  const t = useTranslations("connections.webhookEditor");

  const [value, setValue] = useState(initialUrl ?? "");
  const [status, setStatus] = useState<SaveStatus>("idle");

  async function handleSave() {
    setStatus("saving");
    try {
      const res = await fetch(`/api/connections/${connectionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetWebhookUrl: value }),
      });
      if (!res.ok) throw new Error("save failed");
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setStatus("idle");
          }}
          placeholder={t("placeholder")}
          className="h-8 text-xs"
        />
        <Button
          size="sm"
          variant="outline"
          onClick={handleSave}
          disabled={status === "saving"}
        >
          {status === "saving" ? t("saving") : t("save")}
        </Button>
      </div>
      {status === "saved" && (
        <span className="text-xs text-emerald-600 dark:text-emerald-400">
          {t("saved")}
        </span>
      )}
      {status === "error" && (
        <span className="text-xs text-destructive">{t("error")}</span>
      )}
    </div>
  );
}
