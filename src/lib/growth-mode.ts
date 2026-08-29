// Modalità "Private Engine" B2B: la registrazione pubblica self-service è
// congelata (non cancellata) finché questa costante resta false — landing page,
// header e pricing table mostrano "Accedi alla Piattaforma" al posto dei CTA
// di registrazione/checkout diretto. La rotta /register e l'endpoint
// POST /api/auth/register restano protetti lato server indipendentemente da
// questo flag (vedi src/lib/superadmin.ts). Passare a true riattiva i CTA
// pubblici per il prossimo passo B2C, senza altre modifiche al codice.
export const PUBLIC_SIGNUP_ENABLED = false;
