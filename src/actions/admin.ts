"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isSuperAdminEmail } from "@/lib/superadmin";

async function requireSuperAdmin() {
  const session = await auth();
  if (!session || !isSuperAdminEmail(session.user.email)) {
    throw new Error("Unauthorized");
  }
}

// Libera una licenza (slot di maxConnections) rimuovendo una connessione che
// il cliente ha disconnesso o che è finita in errore: countAgencyConnections
// conta ogni riga WhatsappConnection a prescindere dallo stato, quindi finché
// la riga esiste lo slot resta occupato per sempre, anche a numero disconnesso.
export async function unlockConnectionAction(connectionId: string) {
  await requireSuperAdmin();

  const connection = await prisma.whatsappConnection.findUnique({
    where: { id: connectionId },
  });
  if (!connection) {
    throw new Error("Connessione non trovata");
  }
  if (connection.status !== "DISCONNECTED" && connection.status !== "ERROR") {
    throw new Error("Si può sbloccare solo una connessione disconnessa o in errore");
  }

  await prisma.whatsappConnection.delete({ where: { id: connectionId } });

  revalidatePath("/admin");
}
