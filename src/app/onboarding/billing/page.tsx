import { redirect } from "next/navigation";
import { MessageSquareText, ShieldCheck, CreditCard, Zap } from "lucide-react";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { StripeActionButton } from "@/components/billing/stripe-action-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function BillingOnboardingPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const agency = await prisma.agency.findUnique({
    where: { id: session.user.agencyId },
    select: { billingSetupCompletedAt: true, billingStatus: true, name: true },
  });

  if (agency?.billingStatus === "SUSPENDED") redirect("/account-suspended");

  // Se il setup è già completato, non serve stare qui
  if (agency?.billingSetupCompletedAt) redirect("/dashboard");

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg space-y-6">
        <div className="flex items-center gap-2 font-semibold">
          <MessageSquareText className="size-5 text-primary" />
          <span>FusionWA</span>
        </div>

        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Configura il tuo billing</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Prima di attivare una connessione WhatsApp, salva un metodo di pagamento.
          </p>
        </div>

        <div className="grid gap-3">
          <div className="flex items-start gap-3 rounded-lg border p-4">
            <Zap className="mt-0.5 size-5 shrink-0 text-emerald-500" />
            <div>
              <p className="text-sm font-medium">1 connessione WhatsApp gratuita</p>
              <p className="text-xs text-muted-foreground">
                La prima connessione è inclusa senza costo aggiuntivo.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-lg border p-4">
            <CreditCard className="mt-0.5 size-5 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-medium">Connessioni aggiuntive a €5 cadauna</p>
              <p className="text-xs text-muted-foreground">
                Ogni connessione successiva viene addebitata automaticamente quando viene attivata.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-lg border p-4">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Nessun addebito durante il setup</p>
              <p className="text-xs text-muted-foreground">
                Salviamo solo i dati di fatturazione ora. Non verrà addebitato nulla fino alla
                creazione della seconda connessione.
              </p>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Configura fatturazione</CardTitle>
            <CardDescription>
              Verrai reindirizzato su Stripe per inserire i dati della carta in modo sicuro.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <StripeActionButton
              endpoint="/api/stripe/setup"
              label="Configura fatturazione →"
              loadingLabel="Reindirizzamento…"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
