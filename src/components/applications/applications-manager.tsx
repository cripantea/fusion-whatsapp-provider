"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { createAppAction, revokeAppAction } from "@/actions/apps";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type AppRow = {
  id: string;
  name: string;
  apiKey: string;
  revoked: boolean;
  customersCount: number;
  connectedCount: number;
};

type RevealedSecret = { name: string; apiKey: string; rawApiSecret: string };

export function ApplicationsManager({
  apps: initialApps,
  maxConnections,
}: {
  apps: AppRow[];
  maxConnections: number;
}) {
  const t = useTranslations("settings.applications");

  const [apps, setApps] = useState(initialApps);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<RevealedSecret | null>(null);
  const [copiedField, setCopiedField] = useState<"apiKey" | "apiSecret" | null>(null);
  const [confirmingRevokeId, setConfirmingRevokeId] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  async function handleCreate() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError(t("nameRequired"));
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const result = await createAppAction(trimmedName);
      setApps((current) => [
        {
          id: result.id,
          name: result.name,
          apiKey: result.apiKey,
          revoked: false,
          customersCount: 0,
          connectedCount: 0,
        },
        ...current,
      ]);
      setRevealed({ name: result.name, apiKey: result.apiKey, rawApiSecret: result.rawApiSecret });
      setName("");
    } catch {
      setError(t("errorGeneric"));
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(appId: string) {
    setRevokingId(appId);
    try {
      await revokeAppAction(appId);
      setApps((current) =>
        current.map((app) => (app.id === appId ? { ...app, revoked: true } : app))
      );
    } catch {
      setError(t("errorGeneric"));
    } finally {
      setRevokingId(null);
      setConfirmingRevokeId(null);
    }
  }

  async function copyToClipboard(value: string, field: "apiKey" | "apiSecret") {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      setTimeout(() => setCopiedField((current) => (current === field ? null : current)), 2000);
    } catch {
      // Clipboard non disponibile (es. contesto non sicuro): l'utente può comunque
      // selezionare e copiare il testo manualmente, il valore resta visibile a schermo.
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("createTitle")}</CardTitle>
          <CardDescription>{t("createDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:max-w-md">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="app-name" className="text-sm font-medium">
              {t("nameLabel")}
            </label>
            <Input
              id="app-name"
              placeholder={t("namePlaceholder")}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}

          {revealed && (
            <div className="flex flex-col gap-3 rounded-lg border border-amber-500/50 bg-amber-500/5 p-4">
              <p className="text-sm font-medium">{t("secretRevealTitle", { name: revealed.name })}</p>
              <p className="text-sm text-muted-foreground">{t("secretRevealDescription")}</p>

              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-muted-foreground">{t("apiKeyLabel")}</span>
                <div className="flex items-center gap-2">
                  <code className="flex-1 truncate rounded bg-muted px-2 py-1 text-xs">
                    {revealed.apiKey}
                  </code>
                  <Button
                    type="button"
                    variant="outline"
                    className="shrink-0"
                    onClick={() => copyToClipboard(revealed.apiKey, "apiKey")}
                  >
                    {copiedField === "apiKey" ? t("copied") : t("copyButton")}
                  </Button>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-muted-foreground">{t("apiSecretLabel")}</span>
                <div className="flex items-center gap-2">
                  <code className="flex-1 truncate rounded bg-muted px-2 py-1 text-xs">
                    {revealed.rawApiSecret}
                  </code>
                  <Button
                    type="button"
                    variant="outline"
                    className="shrink-0"
                    onClick={() => copyToClipboard(revealed.rawApiSecret, "apiSecret")}
                  >
                    {copiedField === "apiSecret" ? t("copied") : t("copyButton")}
                  </Button>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-fit"
                onClick={() => setRevealed(null)}
              >
                {t("doneButton")}
              </Button>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button onClick={handleCreate} disabled={creating}>
            {creating ? t("creating") : t("createButton")}
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("tableName")}</TableHead>
                <TableHead>{t("tableApiKey")}</TableHead>
                <TableHead>{t("tableCustomers")}</TableHead>
                <TableHead>{t("tableConnections")}</TableHead>
                <TableHead>{t("tableStatus")}</TableHead>
                <TableHead className="text-right">{t("tableActions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {apps.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    {t("empty")}
                  </TableCell>
                </TableRow>
              ) : (
                apps.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell className="font-medium">{app.name}</TableCell>
                    <TableCell>
                      <code className="text-xs text-muted-foreground">{app.apiKey}</code>
                    </TableCell>
                    <TableCell>{app.customersCount}</TableCell>
                    <TableCell>
                      {app.connectedCount} / {maxConnections}
                    </TableCell>
                    <TableCell>
                      <Badge variant={app.revoked ? "destructive" : "default"}>
                        {app.revoked ? t("statusRevoked") : t("statusActive")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {app.revoked ? null : confirmingRevokeId === app.id ? (
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="destructive"
                            disabled={revokingId === app.id}
                            onClick={() => handleRevoke(app.id)}
                          >
                            {revokingId === app.id ? t("revoking") : t("revokeConfirm")}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setConfirmingRevokeId(null)}
                          >
                            {t("cancel")}
                          </Button>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setConfirmingRevokeId(app.id)}
                        >
                          {t("revokeButton")}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
