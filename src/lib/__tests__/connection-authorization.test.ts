import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authorizeNewConnection } from '@/lib/connection-authorization';

// Mock Prisma so tests run without a DB
vi.mock('@/lib/prisma', () => ({
  prisma: {
    agency: {
      findUnique: vi.fn(),
    },
    app: {
      findUnique: vi.fn(),
    },
  },
}));

// Mock counting helpers
vi.mock('@/lib/connection-limits', () => ({
  FREE_CONNECTIONS_INCLUDED: 1,
  PLATFORM_DEFAULT_CONNECTION_CAP: 300,
  getAgencyEffectiveConnectionCount: vi.fn(),
  getAppEffectiveConnectionCount: vi.fn(),
}));

import { prisma } from '@/lib/prisma';
import {
  getAgencyEffectiveConnectionCount,
  getAppEffectiveConnectionCount,
} from '@/lib/connection-limits';

const mockAgency = prisma.agency.findUnique as ReturnType<typeof vi.fn>;
const mockApp = prisma.app.findUnique as ReturnType<typeof vi.fn>;
const mockAgencyCount = getAgencyEffectiveConnectionCount as ReturnType<typeof vi.fn>;
const mockAppCount = getAppEffectiveConnectionCount as ReturnType<typeof vi.fn>;

const baseAgency = {
  billingStatus: 'NOT_CONFIGURED',
  autoBillingEnabled: false,
  globalConnectionLimit: null,
  defaultAppConnectionLimit: null,
  platformLimitOverride: null,
};

beforeEach(() => {
  vi.clearAllMocks();
});

// Case 1: Agency not found
describe('Case 1 – agency not found', () => {
  it('returns AGENCY_NOT_FOUND', async () => {
    mockAgency.mockResolvedValue(null);
    const result = await authorizeNewConnection({ agencyId: 'nonexistent' });
    expect(result).toEqual({ allowed: false, reason: 'AGENCY_NOT_FOUND' });
  });
});

// Case 2: Account suspended
describe('Case 2 – account suspended', () => {
  it('returns ACCOUNT_SUSPENDED before counting connections', async () => {
    mockAgency.mockResolvedValue({ ...baseAgency, billingStatus: 'SUSPENDED' });
    const result = await authorizeNewConnection({ agencyId: 'a1' });
    expect(result).toEqual({ allowed: false, reason: 'ACCOUNT_SUSPENDED' });
    expect(mockAgencyCount).not.toHaveBeenCalled();
  });
});

// Case 3: Platform cap reached (default 300)
describe('Case 3 – platform cap reached', () => {
  it('returns PLATFORM_LIMIT_REACHED when count >= 300', async () => {
    mockAgency.mockResolvedValue(baseAgency);
    mockAgencyCount.mockResolvedValue(300);
    const result = await authorizeNewConnection({ agencyId: 'a1' });
    expect(result).toEqual({ allowed: false, reason: 'PLATFORM_LIMIT_REACHED' });
  });
});

// Case 4: Platform cap overridden by superadmin
describe('Case 4 – platform cap with override', () => {
  it('uses platformLimitOverride instead of 300', async () => {
    mockAgency.mockResolvedValue({ ...baseAgency, platformLimitOverride: 500 });
    mockAgencyCount.mockResolvedValue(300); // would be blocked at default 300, but override is 500
    const result = await authorizeNewConnection({ agencyId: 'a1' });
    // 300 < 500 so not platform-blocked; but billingStatus NOT_CONFIGURED → BILLING_NOT_READY
    expect(result).toEqual({ allowed: false, reason: 'AUTOBILLING_DISABLED' });
  });
});

// Case 5: Global connection limit reached
describe('Case 5 – global connection limit reached', () => {
  it('returns GLOBAL_LIMIT_REACHED when count >= globalConnectionLimit', async () => {
    mockAgency.mockResolvedValue({ ...baseAgency, globalConnectionLimit: 10 });
    mockAgencyCount.mockResolvedValue(10);
    const result = await authorizeNewConnection({ agencyId: 'a1' });
    expect(result).toEqual({ allowed: false, reason: 'GLOBAL_LIMIT_REACHED' });
  });
});

// Case 6: First free connection (effectiveCount = 0 < FREE_CONNECTIONS_INCLUDED = 1)
describe('Case 6 – first free connection', () => {
  it('allows without requiring billing setup', async () => {
    mockAgency.mockResolvedValue(baseAgency);
    mockAgencyCount.mockResolvedValue(0);
    const result = await authorizeNewConnection({ agencyId: 'a1' });
    expect(result).toEqual({ allowed: true, reason: 'ALLOWED_FREE', isFree: true });
  });
});

// Case 7: Second connection – autoBilling disabled
describe('Case 7 – autoBilling disabled', () => {
  it('returns AUTOBILLING_DISABLED when count >= FREE_CONNECTIONS_INCLUDED', async () => {
    mockAgency.mockResolvedValue({ ...baseAgency, autoBillingEnabled: false });
    mockAgencyCount.mockResolvedValue(1);
    const result = await authorizeNewConnection({ agencyId: 'a1' });
    expect(result).toEqual({ allowed: false, reason: 'AUTOBILLING_DISABLED' });
  });
});

// Case 8: autoBilling enabled but billing not ready
describe('Case 8 – autoBilling enabled, billing not ready', () => {
  it('returns BILLING_NOT_READY', async () => {
    mockAgency.mockResolvedValue({
      ...baseAgency,
      autoBillingEnabled: true,
      billingStatus: 'NOT_CONFIGURED',
    });
    mockAgencyCount.mockResolvedValue(1);
    const result = await authorizeNewConnection({ agencyId: 'a1' });
    expect(result).toEqual({ allowed: false, reason: 'BILLING_NOT_READY' });
  });
});

// Case 9: Fully paid connection allowed
describe('Case 9 – paid connection allowed', () => {
  it('returns ALLOWED_AUTOBILLING with isFree false', async () => {
    mockAgency.mockResolvedValue({
      ...baseAgency,
      autoBillingEnabled: true,
      billingStatus: 'READY',
    });
    mockAgencyCount.mockResolvedValue(1);
    const result = await authorizeNewConnection({ agencyId: 'a1' });
    expect(result).toEqual({ allowed: true, reason: 'ALLOWED_AUTOBILLING', isFree: false });
  });
});

// Case 10: App-level limit reached (SDK context)
describe('Case 10 – app-level limit reached', () => {
  it('returns APP_LIMIT_REACHED when appCount >= app.connectionLimit', async () => {
    mockAgency.mockResolvedValue({
      ...baseAgency,
      autoBillingEnabled: true,
      billingStatus: 'READY',
    });
    mockAgencyCount.mockResolvedValue(0); // free slot at agency level
    mockApp.mockResolvedValue({ connectionLimit: 2 });
    mockAppCount.mockResolvedValue(2);
    const result = await authorizeNewConnection({ agencyId: 'a1', appId: 'app1' });
    expect(result).toEqual({ allowed: false, reason: 'APP_LIMIT_REACHED' });
  });
});

// Case 11: App inherits defaultAppConnectionLimit from agency
describe('Case 11 – app inherits agency default app limit', () => {
  it('uses defaultAppConnectionLimit when app has no own limit', async () => {
    mockAgency.mockResolvedValue({
      ...baseAgency,
      autoBillingEnabled: true,
      billingStatus: 'READY',
      defaultAppConnectionLimit: 3,
    });
    mockAgencyCount.mockResolvedValue(0);
    mockApp.mockResolvedValue({ connectionLimit: null }); // no own limit
    mockAppCount.mockResolvedValue(3); // equals defaultAppConnectionLimit
    const result = await authorizeNewConnection({ agencyId: 'a1', appId: 'app1' });
    expect(result).toEqual({ allowed: false, reason: 'APP_LIMIT_REACHED' });
  });
});
