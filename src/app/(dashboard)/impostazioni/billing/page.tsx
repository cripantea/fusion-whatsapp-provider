import { redirect } from "next/navigation";
import { CreditCard, CheckCircle, AlertCircle, XCircle, Clock } from "lucide-react";

import { auth } from "@/auth";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StripeActionButton } from "@/components/billing/stripe-action-button";
import { AutoBillingForm } from "@/components/billing/auto-billing-form";
import { getAgencyEffectiveConnectionCount } from "@/lib/connection-limits";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import type { AgencyBillingStatus } from "@/generated/prisma/enums";

function BillingStatusBadge({ status }: { status: AgencyBillingStatus }) {
  switch (status) {
    case "READY":
      return (
        <Badge className="gap-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
          <CheckCircle className="size-3" />
          Pronto
        </Badge>
      );
    case "REQUIRES_ACTION":
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertCircle className="size-3" />
          Azione richiesta
        </Badge>
      );
    case "PAST_DUE":
      return (
        <Badge variant="destructive" className="gap-1">
          <XCircle className="size-3" />
          Scaduto
        </Badge>
      );
    case "SUSPENDED":
      return (
        <Badge variant="destructive" className="gap-1">
          <XCircle className="size-3" />
          Sospeso
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary" className="gap-1">
          <Clock className="size-3" />
          Non configurato
        </Badge>
      );
  }
}

export default async function BillingPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const agency = await prisma.agency.findUnique({
    where: { id: session.user.agencyId },
    select: {
      billingStatus: true,
      autoBillingEnabled: true,
      globalConnectionLimit: true,
      defaultAppConnectionLimit: true,
      defaultPaymentMethodId: true,
      stripeCustomerId: true,
    },
  });

  if (!agency) redirect("/dashboard");

  const effectiveCount = await getAgencyEffectiveConnectionCount(session.user.agencyId);

  let paymentMethodDetails: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  } | null = null;

  if (agency.defaultPaymentMethodId) {
    try {
      const pm = await stripe.paymentMethods.retrieve(agency.defaultPaymentMethodId);
      if (pm.card) {
        paymentMethodDetails = {
          brand: pm.card.brand,
          last4: pm.card.last4,
          expMonth: pm.card.exp_month,
          expYear: pm.card.exp_year,
        };
      }
    } catch {
      // PM rimosso da Stripe; non blocchiamo la pagina
    }
  }

  const cardBrandLabel = paymentMethodDetails
    ? paymentMethodDetails.brand.charAt(0).toUpperCase() + paymentMethodDetails.brand.slice(1)
    : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
        <p className="text-sm text-muted-foreground">
          Gestisci il metodo di pagamento e le impostazioni di fatturazione automatica.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Stato billing</CardTitle>
          <CardDescription>
            Metodo di pagamento attivo e stato del tuo account di fatturazione.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:max-w-md">
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Stato:</span>
            <BillingStatusBadge status={agency.billingStatus} />
          </div>

          {paymentMethodDetails ? (
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <CreditCard className="size-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">
                  {cardBrandLabel} •••• {paymentMethodDetails.last4}
                </p>
                <p className="text-xs text-muted-foreground">
                  Scade {String(paymentMethodDetails.expMonth).padStart(2, "0")}/
                  {paymentMethodDetails.expYear}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nessun metodo di pagamento configurato.</p>
          )}

          <StripeActionButton
            endpoint="/api/stripe/setup"
            label={paymentMethodDetails ? "Cambia metodo di pagamento" : "Configura metodo di pagamento"}
            loadingLabel="Reindirizzamento…"
            variant="outline"
          />

          {agency.billingStatus === "REQUIRES_ACTION" && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-3 space-y-2">
              <p className="text-sm text-destructive">
                Un pagamento richiede la tua autenticazione.
              </p>
              {agency.stripeCustomerId && (
                <StripeActionButton
                  endpoint="/api/stripe/portal"
                  label="Completa il pagamento →"
                  loadingLabel="Reindirizzamento…"
                  variant="default"
                />
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Auto Billing</CardTitle>
          <CardDescription>
            Consenti a FusionWA di addebitare automaticamente nuove connessioni WhatsApp (€5
            cad.). La prima connessione è sempre gratuita.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:max-w-md">
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Auto Billing:</span>
            {agency.autoBillingEnabled ? (
              <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                ON
              </Badge>
            ) : (
              <Badge variant="secondary">OFF</Badge>
            )}
          </div>

          <div className="text-sm text-muted-foreground space-y-1">
            {agency.globalConnectionLimit !== null && (
              <p>
                Limite globale:{" "}
                <span className="font-medium text-foreground">{agency.globalConnectionLimit}</span>
              </p>
            )}
            {agency.defaultAppConnectionLimit !== null && (
              <p>
                Limite per App:{" "}
                <span className="font-medium text-foreground">{agency.defaultAppConnectionLimit}</span>
              </p>
            )}
            <p>
              Connessioni attive:{" "}
              <span className="font-medium text-foreground">{effectiveCount}</span>
              {agency.globalConnectionLimit !== null && <> / {agency.globalConnectionLimit}</>}
            </p>
          </div>

          {agency.billingStatus !== "READY" && (
            <p className="text-sm text-amber-600 dark:text-amber-400">
              Configura prima un metodo di pagamento per attivare l&apos;Auto Billing.
            </p>
          )}

          <AutoBillingForm
            isEnabled={agency.autoBillingEnabled}
            isBillingReady={agency.billingStatus === "READY"}
            currentGlobalLimit={agency.globalConnectionLimit ?? undefined}
            currentAppLimit={agency.defaultAppConnectionLimit ?? undefined}
          />
        </CardContent>
      </Card>
    </div>
  );
}
