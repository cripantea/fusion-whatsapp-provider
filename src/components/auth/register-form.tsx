"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function RegisterForm({ plan }: { plan: string | null }) {
  const t = useTranslations("auth.register");
  const tPlans = useTranslations("settings.billing.planLabels");
  const router = useRouter();

  const [agencyName, setAgencyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agencyName, email, password, plan }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : t("errorGeneric"));
        setLoading(false);
        return;
      }

      const signInResult = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (!signInResult || signInResult.error) {
        setError(t("errorGeneric"));
        setLoading(false);
        return;
      }

      router.push("/dashboard");
    } catch {
      setError(t("errorGeneric"));
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {plan && (
        <p className="text-sm text-muted-foreground">
          {t("selectedPlan", { plan: tPlans(plan) })}
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="agencyName" className="text-sm font-medium">
          {t("agencyNameLabel")}
        </label>
        <Input
          id="agencyName"
          name="agencyName"
          required
          autoFocus
          placeholder={t("agencyNamePlaceholder")}
          value={agencyName}
          onChange={(event) => setAgencyName(event.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium">
          {t("emailLabel")}
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium">
          {t("passwordLabel")}
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <span className="text-xs text-muted-foreground">{t("passwordHint")}</span>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" className="mt-2" disabled={loading}>
        {loading ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
}
