"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, Copy, ExternalLink, Search } from "lucide-react";

import {
  createBillingSetupLinkAction,
  createSubscriberAction,
  reactivateAgencyAction,
  suspendAgencyAction,
} from "@/actions/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type BillingStatus = "NOT_CONFIGURED" | "READY" | "REQUIRES_ACTION" | "PAST_DUE" | "SUSPENDED";

type AgencyRow = {
  id: string;
  name: string;
  createdAt: string;
  billingStatus: BillingStatus;
  billingExempt: boolean;
  autoBillingEnabled: boolean;
  hasStripeCustomer: boolean;
  hasPaymentMethod: boolean;
  billingSetupCompletedAt: string | null;
  users: { id: string; email: string; name: string | null; createdAt: string }[];
  connectionCount: number;
  connectedCount: number;
  failedPaymentCount: number;
  latestPayment: { status: string; amount: number; currency: string; createdAt: string } | null;
};

const STATUS_LABEL: Record<BillingStatus, string> = {
  NOT_CONFIGURED: "Da configurare",
  READY: "Pronto",
  REQUIRES_ACTION: "Azione richiesta",
  PAST_DUE: "Pagamento scaduto",
  SUSPENDED: "Sospeso",
};

function statusVariant(status: BillingStatus) {
  if (status === "READY") return "default" as const;
  if (status === "SUSPENDED" || status === "PAST_DUE") return "destructive" as const;
  return "secondary" as const;
}

function NewAccountForm() {
  const [agencyName, setAgencyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function submit() {
    setMessage(null);
    startTransition(async () => {
      try {
        await createSubscriberAction({ agencyName, email, password });
        setAgencyName("");
        setEmail("");
        setPassword("");
        setMessage("Account creato correttamente.");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Impossibile creare l'account");
      }
    });
  }

  return (
    <Card>
      <CardHeader><CardTitle>Crea account</CardTitle></CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end">
        <div className="space-y-1.5"><label className="text-sm font-medium">Azienda</label><Input value={agencyName} onChange={(event) => setAgencyName(event.target.value)} /></div>
        <div className="space-y-1.5"><label className="text-sm font-medium">Email</label><Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></div>
        <div className="space-y-1.5"><label className="text-sm font-medium">Password iniziale</label><Input type="text" value={password} onChange={(event) => setPassword(event.target.value)} /></div>
        <Button onClick={submit} disabled={pending}>{pending ? "Creazione…" : "Crea"}</Button>
        {message && <p className="text-sm text-muted-foreground md:col-span-4">{message}</p>}
      </CardContent>
    </Card>
  );
}

function AccountActions({ agency }: { agency: AgencyRow }) {
  const [pending, startTransition] = useTransition();
  const [setupUrl, setSetupUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function mutate(action: () => Promise<unknown>) {
    setError(null);
    startTransition(async () => {
      try { await action(); } catch (err) { setError(err instanceof Error ? err.message : "Operazione non riuscita"); }
    });
  }

  function createSetupLink() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await createBillingSetupLinkAction(agency.id);
        setSetupUrl(result.url);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Impossibile generare il link");
      }
    });
  }

  async function copyUrl() {
    if (!setupUrl) return;
    await navigator.clipboard.writeText(setupUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap justify-end gap-2">
        {agency.billingStatus !== "READY" && agency.billingStatus !== "SUSPENDED" && (
          <Button size="sm" variant="outline" disabled={pending} onClick={createSetupLink}>Link onboarding Stripe</Button>
        )}
        {agency.billingStatus === "SUSPENDED" ? (
          <Button size="sm" disabled={pending} onClick={() => mutate(() => reactivateAgencyAction(agency.id))}>Riattiva</Button>
        ) : (
          <Button size="sm" variant="destructive" disabled={pending} onClick={() => mutate(() => suspendAgencyAction(agency.id))}>Sospendi</Button>
        )}
      </div>
      {setupUrl && (
        <div className="flex max-w-md items-center gap-1">
          <a href={setupUrl} target="_blank" rel="noreferrer" className="truncate text-xs text-primary underline">Apri link Stripe <ExternalLink className="inline size-3" /></a>
          <Button size="icon-sm" variant="ghost" onClick={copyUrl} aria-label="Copia link">{copied ? <Check /> : <Copy />}</Button>
        </div>
      )}
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}

export function AdminUsers({ agencies }: { agencies: AgencyRow[] }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return agencies;
    return agencies.filter((agency) =>
      agency.name.toLowerCase().includes(needle) || agency.users.some((user) => user.email.toLowerCase().includes(needle))
    );
  }, [agencies, query]);

  const blocked = agencies.filter((agency) => agency.billingStatus !== "READY" && !agency.billingExempt).length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Gestione utenti</h1>
        <p className="text-sm text-muted-foreground">{agencies.length} account totali · {blocked} da controllare</p>
      </div>
      <NewAccountForm />
      <Card>
        <CardHeader className="gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle>Account registrati</CardTitle>
          <div className="relative w-full md:w-80"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" placeholder="Cerca azienda o email" value={query} onChange={(event) => setQuery(event.target.value)} /></div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Account</TableHead><TableHead>Registrazione</TableHead><TableHead>Billing</TableHead><TableHead>Connessioni</TableHead><TableHead>Ultimo pagamento</TableHead><TableHead className="text-right">Azioni</TableHead></TableRow></TableHeader>
            <TableBody>
              {filtered.map((agency) => (
                <TableRow key={agency.id}>
                  <TableCell><div className="font-medium">{agency.name}</div>{agency.users.map((user) => <div key={user.id} className="text-xs text-muted-foreground">{user.email}</div>)}</TableCell>
                  <TableCell className="text-sm">{new Date(agency.createdAt).toLocaleString("it-IT")}</TableCell>
                  <TableCell><div className="space-y-1"><Badge variant={statusVariant(agency.billingStatus)}>{agency.billingExempt ? "Esente" : STATUS_LABEL[agency.billingStatus]}</Badge><div className="text-xs text-muted-foreground">Stripe: {agency.hasStripeCustomer ? "cliente creato" : "non avviato"} · Carta: {agency.hasPaymentMethod ? "presente" : "assente"}</div>{agency.billingSetupCompletedAt && <div className="text-xs text-muted-foreground">Completato {new Date(agency.billingSetupCompletedAt).toLocaleString("it-IT")}</div>}</div></TableCell>
                  <TableCell><div className="text-sm">{agency.connectedCount}/{agency.connectionCount} attive</div>{agency.failedPaymentCount > 0 && <div className="text-xs text-destructive">{agency.failedPaymentCount} pagamento fallito</div>}</TableCell>
                  <TableCell>{agency.latestPayment ? <><div className="text-sm">{agency.latestPayment.status}</div><div className="text-xs text-muted-foreground">{(agency.latestPayment.amount / 100).toLocaleString("it-IT", { style: "currency", currency: agency.latestPayment.currency.toUpperCase() })} · {new Date(agency.latestPayment.createdAt).toLocaleDateString("it-IT")}</div></> : <span className="text-xs text-muted-foreground">Nessun addebito</span>}</TableCell>
                  <TableCell><AccountActions agency={agency} /></TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">Nessun account trovato.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
