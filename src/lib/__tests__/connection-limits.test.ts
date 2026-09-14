import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    whatsappConnection: {
      count: vi.fn(),
    },
  },
}));

import { prisma } from '@/lib/prisma';
import {
  FREE_CONNECTIONS_INCLUDED,
  PLATFORM_DEFAULT_CONNECTION_CAP,
  getAgencyActiveConnectionCount,
  getAgencyReservedConnectionCount,
  getAgencyEffectiveConnectionCount,
  getAppEffectiveConnectionCount,
} from '@/lib/connection-limits';

const mockCount = prisma.whatsappConnection.count as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('constants', () => {
  it('FREE_CONNECTIONS_INCLUDED is 1', () => {
    expect(FREE_CONNECTIONS_INCLUDED).toBe(1);
  });
  it('PLATFORM_DEFAULT_CONNECTION_CAP is 300', () => {
    expect(PLATFORM_DEFAULT_CONNECTION_CAP).toBe(300);
  });
});

describe('getAgencyActiveConnectionCount', () => {
  it('queries only CONNECTED status', async () => {
    mockCount.mockResolvedValue(5);
    const result = await getAgencyActiveConnectionCount('agency1');
    expect(result).toBe(5);
    expect(mockCount).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: 'CONNECTED' }) })
    );
  });
});

describe('getAgencyReservedConnectionCount', () => {
  it('queries only PENDING status', async () => {
    mockCount.mockResolvedValue(2);
    const result = await getAgencyReservedConnectionCount('agency1');
    expect(result).toBe(2);
    expect(mockCount).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: 'PENDING' }) })
    );
  });
});

describe('getAgencyEffectiveConnectionCount', () => {
  it('queries CONNECTED and PENDING (excludes DISCONNECTED/ERROR)', async () => {
    mockCount.mockResolvedValue(7);
    const result = await getAgencyEffectiveConnectionCount('agency1');
    expect(result).toBe(7);
    expect(mockCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: { in: ['CONNECTED', 'PENDING'] } }),
      })
    );
  });
});

describe('getAppEffectiveConnectionCount', () => {
  it('queries CONNECTED and PENDING filtered by appUser.appId', async () => {
    mockCount.mockResolvedValue(3);
    const result = await getAppEffectiveConnectionCount('app1');
    expect(result).toBe(3);
    expect(mockCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: { in: ['CONNECTED', 'PENDING'] },
          appUser: { appId: 'app1' },
        }),
      })
    );
  });
});
