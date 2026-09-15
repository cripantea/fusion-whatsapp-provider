export const TIERS = [
  { label: "Free",    min: 0,  max: 10,       pricePerConnection: 0 },
  { label: "Starter", min: 11, max: 25,       pricePerConnection: 5 },
  { label: "Scale",   min: 26, max: Infinity, pricePerConnection: 3 },
] as const;

export type TierLabel = "Free" | "Starter" | "Scale";

export function getCurrentTier(activeConnections: number): (typeof TIERS)[number] {
  return TIERS.findLast((t) => activeConnections >= t.min) ?? TIERS[0];
}

export function getMonthlyBill(activeConnections: number): number {
  if (activeConnections <= 10) return 0;
  const tier2 = Math.min(activeConnections, 25) - 10;
  const tier3 = Math.max(activeConnections - 25, 0);
  return tier2 * 5 + tier3 * 3;
}

export function getNextConnectionPrice(activeConnections: number): number {
  if (activeConnections < 10) return 0;
  if (activeConnections < 25) return 5;
  return 3;
}
