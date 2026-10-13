export const FINANCE_APR_BPS = 699;
export const FINANCE_TERMS = [36, 48, 60, 72] as const;

export const INVEST_TIERS = [
  { id: "t25", name: "Charge", amountCents: 250_000, horizonMonths: 12, aprBps: 650 },
  { id: "t50", name: "Pulse", amountCents: 500_000, horizonMonths: 12, aprBps: 800 },
  { id: "t100", name: "Dual Motor", amountCents: 1_000_000, horizonMonths: 24, aprBps: 1100 },
  { id: "t250", name: "Plaid", amountCents: 2_500_000, horizonMonths: 36, aprBps: 1450 },
  { id: "t500", name: "Founders", amountCents: 5_000_000, horizonMonths: 48, aprBps: 1650 },
  { id: "t1000", name: "Roadster", amountCents: 10_000_000, horizonMonths: 60, aprBps: 1900 },
] as const;

export type TierId = (typeof INVEST_TIERS)[number]["id"];
export type InvestTier = (typeof INVEST_TIERS)[number];

export function tierById(id: string): InvestTier | null {
  return INVEST_TIERS.find((tier) => tier.id === id) ?? null;
}
