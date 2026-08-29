// Entrambi i canali di vendita attivi in parallelo: self-service pubblico via
// Stripe (CTA di registrazione/checkout visibili su landing/header/pricing) e
// gestione manuale/SuperAdmin per licenze assegnate direttamente (vedi /admin).
// Nota: /register e POST /api/auth/register restano comunque protetti lato
// server per i visitatori anonimi non autenticati — vedi src/lib/superadmin.ts;
// questo flag governa solo la visibilità dei CTA pubblici sulla landing page.
export const PUBLIC_SIGNUP_ENABLED = true;
