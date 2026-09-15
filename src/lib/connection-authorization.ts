import { prisma } from '@/lib/prisma';
import {
  FREE_CONNECTIONS_INCLUDED,
  PLATFORM_DEFAULT_CONNECTION_CAP,
  getAgencyEffectiveConnectionCount,
  getAppEffectiveConnectionCount,
} from '@/lib/connection-limits';

export type AuthorizationContext = 'dashboard' | 'sdk';

export type AuthorizationReason =
  | 'ALLOWED_FREE'
  | 'ALLOWED_AUTOBILLING'
  | 'AGENCY_NOT_FOUND'
  | 'ACCOUNT_SUSPENDED'
  | 'PLATFORM_LIMIT_REACHED'
  | 'GLOBAL_LIMIT_REACHED'
  | 'APP_LIMIT_REACHED'
  | 'AUTOBILLING_DISABLED'
  | 'BILLING_NOT_READY';

export type AuthorizationResult =
  | { allowed: true; reason: 'ALLOWED_FREE' | 'ALLOWED_AUTOBILLING'; isFree: boolean }
  | { allowed: false; reason: Exclude<AuthorizationReason, 'ALLOWED_FREE' | 'ALLOWED_AUTOBILLING'> };

export async function authorizeNewConnection({
  agencyId,
  appId,
}: {
  agencyId: string;
  appId?: string;
  context?: AuthorizationContext;
}): Promise<AuthorizationResult> {
  const agency = await prisma.agency.findUnique({
    where: { id: agencyId },
    select: {
      billingStatus: true,
      billingExempt: true,
      autoBillingEnabled: true,
      globalConnectionLimit: true,
      defaultAppConnectionLimit: true,
      platformLimitOverride: true,
    },
  });

  if (!agency) return { allowed: false, reason: 'AGENCY_NOT_FOUND' };
  if (agency.billingStatus === 'SUSPENDED') return { allowed: false, reason: 'ACCOUNT_SUSPENDED' };

  // Account esente: bypass completo di tutti i gate di billing.
  if (agency.billingExempt) return { allowed: true, reason: 'ALLOWED_FREE', isFree: true };

  const effectiveCount = await getAgencyEffectiveConnectionCount(agencyId);
  const platformCap = agency.platformLimitOverride ?? PLATFORM_DEFAULT_CONNECTION_CAP;

  if (effectiveCount >= platformCap) return { allowed: false, reason: 'PLATFORM_LIMIT_REACHED' };

  if (agency.globalConnectionLimit != null) {
    if (effectiveCount >= agency.globalConnectionLimit) {
      return { allowed: false, reason: 'GLOBAL_LIMIT_REACHED' };
    }
  }

  if (appId !== undefined) {
    const app = await prisma.app.findUnique({
      where: { id: appId },
      select: { connectionLimit: true },
    });
    const effectiveAppLimit = app?.connectionLimit ?? agency.defaultAppConnectionLimit;
    if (effectiveAppLimit != null) {
      const appCount = await getAppEffectiveConnectionCount(appId);
      if (appCount >= effectiveAppLimit) return { allowed: false, reason: 'APP_LIMIT_REACHED' };
    }
  }

  // Billing setup richiesto per TUTTE le connessioni, inclusa la prima gratuita.
  // La prima connessione rimane economicamente gratuita, ma l'Agency deve aver
  // configurato un metodo di pagamento prima di poter attivare qualsiasi connessione.
  if (agency.billingStatus !== 'READY') return { allowed: false, reason: 'BILLING_NOT_READY' };

  const isFree = effectiveCount < FREE_CONNECTIONS_INCLUDED;
  if (isFree) return { allowed: true, reason: 'ALLOWED_FREE', isFree: true };

  if (!agency.autoBillingEnabled) return { allowed: false, reason: 'AUTOBILLING_DISABLED' };

  return { allowed: true, reason: 'ALLOWED_AUTOBILLING', isFree: false };
}
