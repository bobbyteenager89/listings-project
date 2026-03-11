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

export function calculateScore(input: ScoreInput): number {
  let score = 0;
  const effectivePrice = input.netEffective ?? input.price ?? 9999;

  // Price (0-4 pts)
  if (effectivePrice <= 2500) score += 4;
  else if (effectivePrice <= 2800) score += 3;
  else if (effectivePrice <= 3000) score += 2;
  else if (effectivePrice <= 3200) score += 1;

  // Space (0-2 pts)
  if (input.sqft && input.sqft >= 600) score += 2;
  else if (input.sqft && input.sqft >= 450) score += 1;

  // Perks
  if (input.noFee) score += 2;
  if (input.hasLaundry) score += 3;
  if (input.hasElevator) score += 1;
  if (input.newDev) score += 1;

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
