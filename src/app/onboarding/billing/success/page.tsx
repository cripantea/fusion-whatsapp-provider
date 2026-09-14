import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * Pagina di ritorno da Stripe Checkout in mode=setup.
 *
 * NON fidarci del redirect: lo stato definitivo viene impostato dal webhook Stripe
 * (checkout.session.completed). Qui facciamo solo il polling passivo: se il webhook
 * è già arrivato, billingSetupCompletedAt sarà impostato e redirect a dashboard.
 * Se non è ancora arrivato, torniamo alla pagina onboarding che mostrerà
 * lo stato attuale.
 */
export default async function BillingSetupSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  // Piccola pausa per dare tempo al webhook di arrivare in scenari di sviluppo locale.
  // In produzione il webhook arriva praticamente in tempo reale.
  await new Promise((r) => setTimeout(r, 1500));

  const agency = await prisma.agency.findUnique({
    where: { id: session.user.agencyId },
    select: { billingSetupCompletedAt: true },
  });

  if (agency?.billingSetupCompletedAt) {
    redirect("/dashboard");
  }

  // Webhook non ancora arrivato — torna alla pagina onboarding
  redirect("/onboarding/billing?setup=pending");
}
