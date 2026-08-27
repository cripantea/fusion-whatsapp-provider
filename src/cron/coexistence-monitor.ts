import "dotenv/config";

import { prisma } from "@/lib/prisma";

// La Coexistence di Meta (numero già attivo su app WhatsApp Business + Cloud API)
// richiede un heartbeat periodico: oltre 13 giorni senza segnali il collegamento decade.
// Avvisiamo con qualche giorno di anticipo (10 giorni) per lasciare tempo d'azione.
const COEXISTENCE_WARNING_THRESHOLD_DAYS = 10;
const WARNING_CODE = "WARNING_COEXISTENCE_EXPIRING";

async function main() {
  const thresholdDate = new Date(
    Date.now() - COEXISTENCE_WARNING_THRESHOLD_DAYS * 24 * 60 * 60 * 1000
  );

  const expiringConnections = await prisma.whatsappConnection.findMany({
    where: {
      OR: [{ lastHeartbeatAt: null }, { lastHeartbeatAt: { lt: thresholdDate } }],
    },
    include: {
      tenant: {
        select: { id: true, name: true, agencyId: true },
      },
    },
  });

  if (expiringConnections.length === 0) {
    console.log(
      `[coexistence-monitor] nessuna connessione con heartbeat più vecchio di ${COEXISTENCE_WARNING_THRESHOLD_DAYS} giorni.`
    );
    await prisma.$disconnect();
    return;
  }

  for (const connection of expiringConnections) {
    const daysSinceHeartbeat = connection.lastHeartbeatAt
      ? Math.floor((Date.now() - connection.lastHeartbeatAt.getTime()) / (24 * 60 * 60 * 1000))
      : null;

    console.warn(WARNING_CODE, {
      connectionId: connection.id,
      tenantId: connection.tenant.id,
      tenantName: connection.tenant.name,
      agencyId: connection.tenant.agencyId,
      wabaId: connection.wabaId,
      phoneNumberId: connection.phoneNumberId,
      displayPhoneNumber: connection.displayPhoneNumber,
      lastHeartbeatAt: connection.lastHeartbeatAt,
      daysSinceHeartbeat,
    });
  }

  console.log(
    `[coexistence-monitor] ${expiringConnections.length} connessione/i in stato ${WARNING_CODE}.`
  );

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error("[coexistence-monitor] errore durante l'esecuzione:", error);
  process.exit(1);
});
