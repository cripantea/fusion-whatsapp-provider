import Link from "next/link";
import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PLAN_MAX_CONNECTIONS } from "@/lib/plans";
import { PUBLIC_SIGNUP_ENABLED } from "@/lib/growth-mode";
import { StaggerChildren, StaggerItem, FadeUp } from "@/components/landing/motion";

const PLANS = [
  {
    key: "DEVELOPER" as const,
    name: "Developer",
    price: "$0",
    description: "Per iniziare e testare l'integrazione.",
    highlighted: false,
  },
  {
    key: "TEAM" as const,
    name: "Team",
    price: "$29",
    description: "Per team con qualche cliente attivo.",
    highlighted: false,
  },
  {
    key: "AGENCY" as const,
    name: "Agency",
    price: "$79",
    description: "Per software house con clienti multipli.",
    highlighted: true,
  },
  {
    key: "ENTERPRISE" as const,
    name: "Enterprise",
    price: "$199",
    description: "Volumi elevati, SLA dedicato.",
    highlighted: false,
  },
] as const;

export function PricingTable() {
  return (
    <section id="pricing" className="mx-auto max-w-6xl px-6 py-32">
      <FadeUp className="mb-16 max-w-md">
        <p className="mb-4 text-sm font-medium text-muted-foreground">Prezzi</p>
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Semplice,
          <br />
          <span className="text-muted-foreground">prevedibile.</span>
        </h2>
      </FadeUp>

      <StaggerChildren className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PLANS.map((plan) => (
          <StaggerItem key={plan.key}>
            <div
              className={`flex h-full flex-col rounded-xl border p-6 ${
                plan.highlighted
                  ? "border-foreground bg-foreground text-background"
                  : "bg-card"
              }`}
            >
              <div className="mb-6">
                {plan.highlighted && (
                  <p className="mb-3 text-xs font-medium uppercase tracking-widest opacity-60">
                    Più scelto
                  </p>
                )}
                <p className="mb-1 font-semibold">{plan.name}</p>
                <p
                  className={`mb-3 text-sm ${
                    plan.highlighted ? "opacity-70" : "text-muted-foreground"
                  }`}
                >
                  {plan.description}
                </p>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-semibold tracking-tight">{plan.price}</span>
                  <span
                    className={`text-sm ${
                      plan.highlighted ? "opacity-60" : "text-muted-foreground"
                    }`}
                  >
                    /mese
                  </span>
                </div>
              </div>

              <div className="mb-8 flex flex-1 flex-col gap-2.5">
                <div className="flex items-center gap-2 text-sm">
                  <Check
                    className={`size-3.5 shrink-0 ${
                      plan.highlighted ? "opacity-80" : "text-foreground"
                    }`}
                  />
                  <span className={plan.highlighted ? "opacity-80" : "text-muted-foreground"}>
                    Fino a {PLAN_MAX_CONNECTIONS[plan.key]} connessioni WhatsApp
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check
                    className={`size-3.5 shrink-0 ${
                      plan.highlighted ? "opacity-80" : "text-foreground"
                    }`}
                  />
                  <span className={plan.highlighted ? "opacity-80" : "text-muted-foreground"}>
                    SDK widget incluso
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check
                    className={`size-3.5 shrink-0 ${
                      plan.highlighted ? "opacity-80" : "text-foreground"
                    }`}
                  />
                  <span className={plan.highlighted ? "opacity-80" : "text-muted-foreground"}>
                    API REST + webhook
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check
                    className={`size-3.5 shrink-0 ${
                      plan.highlighted ? "opacity-80" : "text-foreground"
                    }`}
                  />
                  <span className={plan.highlighted ? "opacity-80" : "text-muted-foreground"}>
                    Coexistence inclusa
                  </span>
                </div>
              </div>

              <Button
                className="w-full"
                variant={plan.highlighted ? "secondary" : "outline"}
                nativeButton={false}
                render={
                  <Link
                    href={
                      PUBLIC_SIGNUP_ENABLED
                        ? `/register?plan=${plan.key}`
                        : "/login"
                    }
                  />
                }
              >
                {plan.key === "DEVELOPER" && PUBLIC_SIGNUP_ENABLED
                  ? "Inizia gratis"
                  : PUBLIC_SIGNUP_ENABLED
                  ? "Scegli piano"
                  : "Accedi"}
              </Button>
            </div>
          </StaggerItem>
        ))}
      </StaggerChildren>
    </section>
  );
}
