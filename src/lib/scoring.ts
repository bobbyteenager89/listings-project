const PREFERRED_NEIGHBORHOODS = new Set([
  "carroll gardens",
  "cobble hill",
  "brooklyn heights",
  "boerum hill",
  "park slope",
  "fort greene",
  "prospect heights",
  "gowanus",
  "red hook",
  "east village",
  "lower east side",
]);

interface ScoreInput {
  price: number | null;
  netEffective: number | null;
  sqft: number | null;
  noFee: boolean;
  newDev: boolean;
  hasLaundry: boolean;
  hasElevator: boolean;
  photoCount: number;
  neighborhood: string | null;
}

/**
 * Calculate effective monthly cost accounting for no-fee savings
 * and net effective (free months) spread over a 12-month lease.
 */
function effectiveMonthlyCost(input: ScoreInput): number {
  const listPrice = input.price ?? 9999;

  // If net effective is provided, use it directly (already accounts for free months)
  if (input.netEffective) return input.netEffective;

  // If no fee, save ~15% broker fee (1 month rent) spread over 12 months
  if (input.noFee) return listPrice - Math.round(listPrice / 12);

  return listPrice;
}

export function calculateScore(input: ScoreInput): number {
  let score = 0;
  const monthlyCost = effectiveMonthlyCost(input);

  // Effective monthly cost (0-2 pts) — lower weight, quality matters more
  if (monthlyCost <= 2500) score += 2;
  else if (monthlyCost <= 2800) score += 1;

  // Space (0-2 pts)
  if (input.sqft && input.sqft >= 600) score += 2;
  else if (input.sqft && input.sqft >= 450) score += 1;

  // Quality signals
  if (input.hasLaundry) score += 3;
  if (input.newDev) score += 2;
  if (input.hasElevator) score += 1;

  // Preferred neighborhood
  if (
    input.neighborhood &&
    PREFERRED_NEIGHBORHOODS.has(input.neighborhood.toLowerCase())
  )
    score += 1;

  // Penalties
  if (input.photoCount === 0) score -= 3;

  return score;
}
