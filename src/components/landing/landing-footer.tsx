import Link from "next/link";

import { PUBLIC_SIGNUP_ENABLED } from "@/lib/growth-mode";

export function LandingFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-12 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-3">
          <span className="text-sm font-semibold">FusionWA</span>
          <p className="max-w-xs text-sm text-muted-foreground">
            Infrastruttura WhatsApp Business Cloud API per software house e agenzie.
            Nessuna affiliazione con Meta.
          </p>
        </div>

        <div className="flex gap-12">
          <div className="flex flex-col gap-3">
            <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Prodotto
            </span>
            <Link href="/docs" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Documentazione
            </Link>
            <Link href="/#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Prezzi
            </Link>
            {PUBLIC_SIGNUP_ENABLED && (
              <Link href="/register" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Inizia gratis
              </Link>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Account
            </span>
            <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Accedi
            </Link>
            <Link href="/docs" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Guida SDK
            </Link>
            <Link href="/llms.txt" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              llms.txt
            </Link>
          </div>
        </div>
      </div>

      <div className="border-t px-6 py-5">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <p className="text-xs text-muted-foreground">
            © {year} FusionWA. Tutti i diritti riservati.
          </p>
          <p className="max-w-lg text-right text-xs text-muted-foreground">
            FusionWA è un&apos;integrazione indipendente. Non è affiliata, sponsorizzata o approvata da Meta.
          </p>
        </div>
      </div>
    </footer>
  );
}
