"use client";

import { Fragment, useState, useTransition } from "react";

import {
  createSubscriberAction,
  generateCheckoutLinkAction,
  unlockConnectionAction,
  updateAgencyPlanAction,
} from "@/actions/admin";
import { PLAN_TYPES, PAID_PLAN_TYPES } from "@/lib/plans";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const SUBSCRIPTION_STATUSES = [
  "INACTIVE",
  "TRIALING",
  "ACTIVE",
  "PAST_DUE",
  "CANCELED",
  "UNPAID",
] as const;

type ConnectionRow = {
  id: string;
  source: string;
  wabaId: string;
  displayPhoneNumber: string;
  status: "PENDING" | "CONNECTED" | "DISCONNECTED" | "ERROR";
  createdAt: string;
  lastHeartbeatAt: string | null;
};

type AgencyRow = {
  id: string;
  name: string;
  planType: string;
  subscriptionStatus: string;
  maxConnections: number;
  connections: ConnectionRow[];
};

const STATUS_VARIANT: Record<ConnectionRow["status"], "default" | "destructive" | "secondary"> = {
  CONNECTED: "default",
  PENDING: "secondary",
  DISCONNECTED: "secondary",
  ERROR: "destructive",
};

function NewSubscriberForm() {
  const [agencyName, setAgencyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleCreate() {
    setError(null);
    setSuccess(false);
    setCreating(true);
    try {
      await createSubscriberAction({ agencyName, email, password });
      setAgencyName("");
      setEmail("");
      setPassword("");
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore generico");
    } finally {
      setCreating(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nuovo subscriber</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 sm:max-w-md">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Nome agenzia</label>
          <Input value={agencyName} onChange={(e) => setAgencyName(e.target.value)} placeholder="Es. Acme Srl" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Email</label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="cliente@esempio.it"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Password iniziale</label>
          <Input
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Da comunicare al cliente"
          />
          <span className="text-xs text-muted-foreground">Almeno 8 caratteri. Comunicala tu al cliente.</span>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {success && <p className="text-sm text-primary">Subscriber creato.</p>}
        <Button type="button" disabled={creating} onClick={handleCreate} className="w-fit">
          {creating ? "Creazione…" : "Crea subscriber"}
        </Button>
      </CardContent>
    </Card>
  );
}

function PlanManager({ agency }: { agency: AgencyRow }) {
  const [planType, setPlanType] = useState(agency.planType);
  const [subscriptionStatus, setSubscriptionStatus] = useState(agency.subscriptionStatus);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setError(null);
    setSaved(false);
    setSaving(true);
    try {
      await updateAgencyPlanAction({ agencyId: agency.id, planType, subscriptionStatus });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore generico");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-muted-foreground">Piano</label>
        <Select value={planType} onValueChange={(v) => v && setPlanType(v)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PLAN_TYPES.map((plan) => (
              <SelectItem key={plan} value={plan}>
                {plan}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-muted-foreground">Stato abbonamento</label>
        <Select value={subscriptionStatus} onValueChange={(v) => v && setSubscriptionStatus(v)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SUBSCRIPTION_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button type="button" variant="outline" disabled={saving} onClick={handleSave}>
        {saving ? "Salvataggio…" : "Salva piano"}
      </Button>
      {saved && <span className="text-sm text-primary">Salvato</span>}
      {error && <span className="text-sm text-destructive">{error}</span>}
    </div>
  );
}

function PaymentLinkGenerator({ agencyId }: { agencyId: string }) {
  const [planType, setPlanType] = useState<string>(PAID_PLAN_TYPES[0]);
  const [generating, setGenerating] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleGenerate() {
    setError(null);
    setUrl(null);
    setGenerating(true);
    try {
      const result = await generateCheckoutLinkAction({ agencyId, planType });
      setUrl(result.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore generico");
    } finally {
      setGenerating(false);
    }
  }

  async function handleCopy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard non disponibile: l'URL resta comunque visibile a schermo
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">Piano da vendere</label>
          <Select value={planType} onValueChange={(v) => v && setPlanType(v)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAID_PLAN_TYPES.map((plan) => (
                <SelectItem key={plan} value={plan}>
                  {plan}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button type="button" variant="outline" disabled={generating} onClick={handleGenerate}>
          {generating ? "Generazione…" : "Genera link di pagamento"}
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {url && (
        <div className="flex items-center gap-2">
          <code className="flex-1 truncate rounded bg-muted px-2 py-1 text-xs">{url}</code>
          <Button type="button" variant="outline" onClick={handleCopy}>
            {copied ? "Copiato" : "Copia"}
          </Button>
        </div>
      )}
    </div>
  );
}

export function AdminDashboard({ agencies }: { agencies: AgencyRow[] }) {
  const [openAgencyId, setOpenAgencyId] = useState<string | null>(null);
  const [unlockingId, setUnlockingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function handleUnlock(connectionId: string) {
    setError(null);
    setUnlockingId(connectionId);
    startTransition(async () => {
      try {
        await unlockConnectionAction(connectionId);
      } catch {
        setError("Impossibile sbloccare la licenza. Riprova.");
      } finally {
        setUnlockingId(null);
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <NewSubscriberForm />

      <Card>
        <CardHeader>
          <CardTitle>Subscribers</CardTitle>
        </CardHeader>
        <CardContent>
          {error && <p className="mb-4 text-sm text-destructive">{error}</p>}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agenzia</TableHead>
                <TableHead>Piano</TableHead>
                <TableHead>Stato abbonamento</TableHead>
                <TableHead>Connessioni</TableHead>
                <TableHead className="text-right">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agencies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    Nessuna agenzia registrata.
                  </TableCell>
                </TableRow>
              ) : (
                agencies.map((agency) => (
                  <Fragment key={agency.id}>
                    <TableRow>
                      <TableCell className="font-medium">{agency.name}</TableCell>
                      <TableCell>{agency.planType}</TableCell>
                      <TableCell>
                        <Badge
                          variant={agency.subscriptionStatus === "ACTIVE" ? "default" : "secondary"}
                        >
                          {agency.subscriptionStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {agency.connections.length} / {agency.maxConnections}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() =>
                            setOpenAgencyId((current) => (current === agency.id ? null : agency.id))
                          }
                        >
                          {openAgencyId === agency.id ? "Nascondi dettagli" : "Gestisci"}
                        </Button>
                      </TableCell>
                    </TableRow>
                    {openAgencyId === agency.id && (
                      <TableRow>
                        <TableCell colSpan={5}>
                          <div className="flex flex-col gap-6 py-2">
                            <div className="flex flex-col gap-2">
                              <span className="text-sm font-medium">Cambia piano manualmente</span>
                              <PlanManager agency={agency} />
                            </div>

                            <div className="flex flex-col gap-2">
                              <span className="text-sm font-medium">Link di pagamento Stripe</span>
                              <PaymentLinkGenerator agencyId={agency.id} />
                            </div>

                            <div className="flex flex-col gap-2">
                              <span className="text-sm font-medium">Connessioni</span>
                              {agency.connections.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                  Nessuna connessione per questa agenzia.
                                </p>
                              ) : (
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Origine</TableHead>
                                      <TableHead>Numero</TableHead>
                                      <TableHead>WABA ID</TableHead>
                                      <TableHead>Stato</TableHead>
                                      <TableHead>Creata il</TableHead>
                                      <TableHead className="text-right">Azioni</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {agency.connections.map((connection) => (
                                      <TableRow key={connection.id}>
                                        <TableCell>{connection.source}</TableCell>
                                        <TableCell>{connection.displayPhoneNumber}</TableCell>
                                        <TableCell>
                                          <code className="text-xs text-muted-foreground">
                                            {connection.wabaId}
                                          </code>
                                        </TableCell>
                                        <TableCell>
                                          <Badge variant={STATUS_VARIANT[connection.status]}>
                                            {connection.status}
                                          </Badge>
                                        </TableCell>
                                        <TableCell>
                                          {new Date(connection.createdAt).toLocaleDateString("it-IT")}
                                        </TableCell>
                                        <TableCell className="text-right">
                                          {(connection.status === "DISCONNECTED" ||
                                            connection.status === "ERROR") && (
                                            <Button
                                              type="button"
                                              variant="destructive"
                                              disabled={unlockingId === connection.id}
                                              onClick={() => handleUnlock(connection.id)}
                                            >
                                              {unlockingId === connection.id
                                                ? "Sblocco…"
                                                : "Libera licenza"}
                                            </Button>
                                          )}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              )}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
