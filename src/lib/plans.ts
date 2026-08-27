import type { PlanType } from "@/generated/prisma/enums";

export const PLAN_TYPES = ["DEVELOPER", "TEAM", "AGENCY", "ENTERPRISE"] as const satisfies readonly PlanType[];

export const PAID_PLAN_TYPES = ["TEAM", "AGENCY", "ENTERPRISE"] as const satisfies readonly PlanType[];
export type PaidPlanType = (typeof PAID_PLAN_TYPES)[number];

export const PLAN_MAX_CONNECTIONS: Record<PlanType, number> = {
  DEVELOPER: 1,
  TEAM: 5,
  AGENCY: 10,
  ENTERPRISE: 25,
};

export function isPaidPlanType(value: string): value is PaidPlanType {
  return (PAID_PLAN_TYPES as readonly string[]).includes(value);
}

export function isPlanType(value: string): value is PlanType {
  return (PLAN_TYPES as readonly string[]).includes(value);
}

export function getPriceIdForPlan(plan: PaidPlanType): string | undefined {
  switch (plan) {
    case "TEAM":
      return process.env.STRIPE_PRICE_ID_TEAM;
    case "AGENCY":
      return process.env.STRIPE_PRICE_ID_AGENCY;
    case "ENTERPRISE":
      return process.env.STRIPE_PRICE_ID_ENTERPRISE;
  }
}

export function getPlanForPriceId(priceId: string | null | undefined): PaidPlanType | null {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_PRICE_ID_TEAM) return "TEAM";
  if (priceId === process.env.STRIPE_PRICE_ID_AGENCY) return "AGENCY";
  if (priceId === process.env.STRIPE_PRICE_ID_ENTERPRISE) return "ENTERPRISE";
  return null;
}
