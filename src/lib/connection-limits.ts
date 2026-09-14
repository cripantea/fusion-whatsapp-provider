import { prisma } from './prisma';

export const FREE_CONNECTIONS_INCLUDED = 1;
export const PLATFORM_DEFAULT_CONNECTION_CAP = 300;

export async function getAgencyActiveConnectionCount(agencyId: string): Promise<number> {
  return prisma.whatsappConnection.count({
    where: {
      status: 'CONNECTED',
      OR: [{ tenant: { agencyId } }, { appUser: { app: { agencyId } } }],
    },
  });
}

export async function getAgencyReservedConnectionCount(agencyId: string): Promise<number> {
  return prisma.whatsappConnection.count({
    where: {
      status: 'PENDING',
      OR: [{ tenant: { agencyId } }, { appUser: { app: { agencyId } } }],
    },
  });
}

// CONNECTED + PENDING: prevents race conditions where two concurrent requests
// both pass the limit check before either is committed to the DB.
export async function getAgencyEffectiveConnectionCount(agencyId: string): Promise<number> {
  return prisma.whatsappConnection.count({
    where: {
      status: { in: ['CONNECTED', 'PENDING'] },
      OR: [{ tenant: { agencyId } }, { appUser: { app: { agencyId } } }],
    },
  });
}

export async function getAppEffectiveConnectionCount(appId: string): Promise<number> {
  return prisma.whatsappConnection.count({
    where: {
      status: { in: ['CONNECTED', 'PENDING'] },
      appUser: { appId },
    },
  });
}
