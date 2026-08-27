"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

export function StripeActionButton({
  endpoint,
  body,
  label,
  loadingLabel,
  variant = "default",
}: {
  endpoint: string;
  body?: Record<string, unknown>;
  label: string;
  loadingLabel: string;
  variant?: "default" | "outline";
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();

      if (!res.ok || typeof data.url !== "string") {
        setError(typeof data.error === "string" ? data.error : "Errore");
        setLoading(false);
        return;
      }

      window.location.href = data.url;
    } catch {
      setError("Errore di rete");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <Button variant={variant} onClick={handleClick} disabled={loading} className="w-full">
        {loading ? loadingLabel : label}
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
