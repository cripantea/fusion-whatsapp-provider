import { prisma } from "@/lib/prisma";

// Somma le connessioni possedute direttamente dai tenant dell'agency (dashboard, Step 5)
// e quelle possedute dagli appUser delle sue App (SDK, Step 9): un unico limite di piano
// vale per l'intera agency, indipendentemente da come la connessione è stata creata.
export async function countAgencyConnections(agencyId: string): Promise<number> {
  return prisma.whatsappConnection.count({
    where: {
      OR: [{ tenant: { agencyId } }, { appUser: { app: { agencyId } } }],
    },
  });
}
