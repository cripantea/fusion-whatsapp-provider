import { prisma } from './prisma';

/**
 * READY richiede tutti e tre:
 * - stripeCustomerId: customer Stripe esistente
 * - defaultPaymentMethodId: carta salvata e pronta per addebiti off-session
 * - billingSetupCompletedAt: setup confermato server-side via webhook Stripe
 *
 * Non basta che billingStatus === 'READY' nel DB: questo helper
 * è la fonte di verità per chi ha bisogno del controllo esplicito.
 * La colonna billingStatus viene aggiornata dallo stesso webhook che
 * imposta i tre campi sopra, quindi nella pratica sono sempre allineati.
 */
export async function isAgencyBillingReady(agencyId: string): Promise<boolean> {
  const agency = await prisma.agency.findUnique({
    where: { id: agencyId },
    select: { billingStatus: true, stripeCustomerId: true, defaultPaymentMethodId: true, billingSetupCompletedAt: true },
  });
  return (
    agency?.billingStatus === 'READY' &&
    agency.stripeCustomerId !== null &&
    agency.defaultPaymentMethodId !== null &&
    agency.billingSetupCompletedAt !== null
  );
}
