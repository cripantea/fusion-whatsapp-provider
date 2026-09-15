export const TIERS = [
  { label: "Free",    min: 1,  max: 1,        pricePerConnection: 0 },
  { label: "Starter", min: 2,  max: 9,        pricePerConnection: 5 },
  { label: "Growth",  min: 10, max: 24,       pricePerConnection: 4 },
  { label: "Scale",   min: 25, max: Infinity, pricePerConnection: 3 },
] as const;

export type TierLabel = "Free" | "Starter" | "Growth" | "Scale";

/** Returns the tier of the most recently added (marginal) connection. */
export function getCurrentTier(activeConnections: number): (typeof TIERS)[number] {
  if (activeConnections <= 0) return TIERS[0];
  return TIERS.findLast((t) => activeConnections >= t.min) ?? TIERS[0];
}

/** Tiered billing: first free, then each bracket priced independently. */
export function getMonthlyBill(activeConnections: number): number {
  if (activeConnections <= 1) return 0;

  let total = 0;

  // Bracket 2–9: €5 each (max 8 connections)
  const tier2 = Math.min(activeConnections - 1, 8);
  total += tier2 * 5;

  if (activeConnections > 9) {
    // Bracket 10–24: €4 each (max 15 connections)
    const tier3 = Math.min(activeConnections - 9, 15);
    total += tier3 * 4;
  }

  if (activeConnections > 24) {
    // Bracket 25+: €3 each
    total += (activeConnections - 24) * 3;
  }

  return total;
}

export function getNextConnectionPrice(activeConnections: number): number {
  if (activeConnections < 1) return 0;
  if (activeConnections < 9) return 5;
  if (activeConnections < 24) return 4;
  return 3;
}
