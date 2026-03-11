import type { ListingSource, NormalizedListing } from "./types";

// StreetEasy "South Brooklyn" area covers Carroll Gardens, Cobble Hill, Brooklyn Heights,
// Boerum Hill, Park Slope, Gowanus, Red Hook. We add separate URLs for Fort Greene,
// Prospect Heights (which fall under "Fort Greene/Clinton Hill" and "Crown Heights" areas).
const SEARCH_URLS = [
  "https://streeteasy.com/for-rent/south-brooklyn/price:-3200%7Cbeds:0?sort_by=listed_desc",
  "https://streeteasy.com/for-rent/fort-greene/price:-3200%7Cbeds:0?sort_by=listed_desc",
  "https://streeteasy.com/for-rent/prospect-heights/price:-3200%7Cbeds:0?sort_by=listed_desc",
];

const APIFY_BASE = "https://api.apify.com/v2";

export const streeteasy: ListingSource = {
  name: "streeteasy",

  async fetchListings(): Promise<NormalizedListing[]> {
    const token = process.env.APIFY_TOKEN;

    // Start the actor run
    const runRes = await fetch(
      `${APIFY_BASE}/acts/jupri~streeteasy-scraper/runs?token=${token}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startUrls: SEARCH_URLS.map((url) => ({ url })),
          maxItems: 200,
        }),
      }
    );
    if (!runRes.ok) throw new Error(`Apify run failed: ${runRes.status}`);
    const run = await runRes.json();

    // Wait for the run to finish
    const waitRes = await fetch(
      `${APIFY_BASE}/actor-runs/${run.data.id}?token=${token}&waitForFinish=300`
    );
    if (!waitRes.ok) throw new Error(`Apify wait failed: ${waitRes.status}`);
    const waitData = await waitRes.json();

    // Get dataset items
    const datasetId = waitData.data.defaultDatasetId;
    const itemsRes = await fetch(
      `${APIFY_BASE}/datasets/${datasetId}/items?token=${token}`
    );
    if (!itemsRes.ok) throw new Error(`Apify dataset failed: ${itemsRes.status}`);
    const items = await itemsRes.json();

    // Deduplicate by URL in case areas overlap
    const seen = new Set<string>();
    const results: NormalizedListing[] = [];
    for (const item of items) {
      const normalized = normalizeItem(item as Record<string, unknown>);
      if (!seen.has(normalized.url)) {
        seen.add(normalized.url);
        results.push(normalized);
      }
    }
    return results;
  },
};

function normalizeItem(item: Record<string, unknown>): NormalizedListing {
  const amenities = String(item.amenities ?? "").toLowerCase();

  return {
    source: "streeteasy",
    sourceId: String(item.id ?? item.listingId ?? ""),
    url: String(item.url ?? item.detailUrl ?? ""),
    address: String(item.address ?? item.street ?? ""),
    unit: (item.unit as string) ?? null,
    neighborhood: String(item.neighborhood ?? item.areaName ?? ""),
    price: Number(item.price ?? 0),
    netEffective: item.netEffectivePrice
      ? Number(item.netEffectivePrice)
      : null,
    sqft:
      item.squareFeet ?? item.livingAreaSize
        ? Number(item.squareFeet ?? item.livingAreaSize)
        : null,
    noFee: Boolean(item.noFee),
    newDev: Boolean(item.isNewDevelopment ?? item.newDev),
    hasLaundry: amenities.includes("laundry") || amenities.includes("washer"),
    hasElevator: amenities.includes("elevator"),
    photoCount: Number(item.photoCount ?? item.mediaAssetCount ?? 0),
  };
}
