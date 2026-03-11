import { ApifyClient } from "apify-client";
import type { ListingSource, NormalizedListing } from "./types";

// StreetEasy "South Brooklyn" area covers Carroll Gardens, Cobble Hill, Brooklyn Heights,
// Boerum Hill, Park Slope, Gowanus, Red Hook. We add separate URLs for Fort Greene,
// Prospect Heights (which fall under "Fort Greene/Clinton Hill" and "Crown Heights" areas).
const SEARCH_URLS = [
  "https://streeteasy.com/for-rent/south-brooklyn/price:-3200%7Cbeds:0?sort_by=listed_desc",
  "https://streeteasy.com/for-rent/fort-greene/price:-3200%7Cbeds:0?sort_by=listed_desc",
  "https://streeteasy.com/for-rent/prospect-heights/price:-3200%7Cbeds:0?sort_by=listed_desc",
];

export const streeteasy: ListingSource = {
  name: "streeteasy",

  async fetchListings(): Promise<NormalizedListing[]> {
    const client = new ApifyClient({
      token: process.env.APIFY_TOKEN,
    });

    const run = await client.actor("jupri/streeteasy-scraper").call({
      startUrls: SEARCH_URLS.map((url) => ({ url })),
      maxItems: 200,
    });

    const { items } = await client
      .dataset(run.defaultDatasetId)
      .listItems();

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
