import Link from "next/link";
import { CheckCircle2, Circle, ArrowRight } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type ChecklistProps = {
  billingReady: boolean;
  hasApps: boolean;
  hasConnections: boolean;
  t: (key: string) => string;
};

type Step = {
  key: "billing" | "app" | "connection";
  href: string;
  done: boolean;
};

export function OnboardingChecklist({ billingReady, hasApps, hasConnections, t }: ChecklistProps) {
  if (hasApps && hasConnections) return null;

  const steps: Step[] = [
    { key: "app", href: "/applicazioni", done: hasApps },
    { key: "connection", href: "/docs", done: hasConnections },
    { key: "billing", href: "/impostazioni/billing", done: billingReady },
  ];

  const doneCount = steps.filter((s) => s.done).length;

  return (
    <Card className="border-primary/20 bg-primary/3">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">{t("onboarding.title")}</CardTitle>
          <span className="text-xs text-muted-foreground">
            {doneCount} / {steps.length}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">{t("onboarding.subtitle")}</p>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {steps.map((step) => (
          <div
            key={step.key}
            className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
              step.done
                ? "border-transparent bg-transparent opacity-50"
                : "border-border bg-background hover:border-primary/30"
            }`}
          >
            {step.done ? (
              <CheckCircle2 className="size-4 shrink-0 text-primary" />
            ) : (
              <Circle className="size-4 shrink-0 text-muted-foreground/40" />
            )}
            <div className="min-w-0 flex-1">
              <p className={`text-sm font-medium ${step.done ? "line-through" : ""}`}>
                {t(`onboarding.steps.${step.key}.title`)}
              </p>
              {!step.done && (
                <p className="text-xs text-muted-foreground">
                  {t(`onboarding.steps.${step.key}.description`)}
                </p>
              )}
            </div>
            {!step.done && (
              <Button
                size="sm"
                variant="ghost"
                className="shrink-0 gap-1 text-xs"
                nativeButton={false}
                render={<Link href={step.href} />}
              >
                {t("onboarding.action")}
                <ArrowRight className="size-3" />
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
