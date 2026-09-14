"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  enableAutoBillingAction,
  disableAutoBillingAction,
  updateConnectionLimitsAction,
} from "@/actions/billing";

type Props = {
  isEnabled: boolean;
  isBillingReady: boolean;
  currentGlobalLimit?: number;
  currentAppLimit?: number;
};

export function AutoBillingForm({
  isEnabled,
  isBillingReady,
  currentGlobalLimit,
  currentAppLimit,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [globalLimit, setGlobalLimit] = useState(String(currentGlobalLimit ?? ""));
  const [appLimit, setAppLimit] = useState(String(currentAppLimit ?? ""));

  function handleEnable() {
    setError(null);
    const gl = parseInt(globalLimit, 10);
    const al = parseInt(appLimit, 10);
    if (!gl || !al) {
      setError("Imposta entrambi i limiti prima di attivare l'Auto Billing.");
      return;
    }
    startTransition(async () => {
      try {
        await enableAutoBillingAction({ globalConnectionLimit: gl, defaultAppConnectionLimit: al });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Errore");
      }
    });
  }

  function handleDisable() {
    setError(null);
    startTransition(async () => {
      try {
        await disableAutoBillingAction();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Errore");
      }
    });
  }

  function handleUpdateLimits() {
    setError(null);
    const gl = parseInt(globalLimit, 10);
    const al = parseInt(appLimit, 10);
    if (!gl || !al) {
      setError("Valori non validi.");
      return;
    }
    startTransition(async () => {
      try {
        await updateConnectionLimitsAction({ globalConnectionLimit: gl, defaultAppConnectionLimit: al });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Errore");
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="global-limit" className="text-xs">
            Limite globale connessioni
          </Label>
          <Input
            id="global-limit"
            type="number"
            min={1}
            value={globalLimit}
            onChange={(e) => setGlobalLimit(e.target.value)}
            placeholder="es. 20"
            disabled={!isBillingReady || isPending}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="app-limit" className="text-xs">
            Limite per App
          </Label>
          <Input
            id="app-limit"
            type="number"
            min={1}
            value={appLimit}
            onChange={(e) => setAppLimit(e.target.value)}
            placeholder="es. 5"
            disabled={!isBillingReady || isPending}
          />
        </div>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="flex flex-wrap gap-2">
        {!isEnabled ? (
          <Button
            onClick={handleEnable}
            disabled={!isBillingReady || isPending}
            size="sm"
          >
            {isPending ? "Salvataggio…" : "Attiva Auto Billing"}
          </Button>
        ) : (
          <>
            <Button onClick={handleUpdateLimits} disabled={isPending} size="sm" variant="outline">
              {isPending ? "Salvataggio…" : "Aggiorna limiti"}
            </Button>
            <Button onClick={handleDisable} disabled={isPending} size="sm" variant="ghost" className="text-destructive">
              Disattiva Auto Billing
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
