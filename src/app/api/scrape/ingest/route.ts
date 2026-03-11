import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { listings } from "@/lib/db/schema";
import { calculateScore } from "@/lib/scoring";
import type { NormalizedListing } from "@/lib/sources/types";
import { eq, sql } from "drizzle-orm";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const items: NormalizedListing[] = body.listings;

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "No listings provided" }, { status: 400 });
  }

  const results = { total: items.length, new: 0, updated: 0, errors: [] as string[] };

  // Get all existing streeteasy URLs
  const existing = await db
    .select({
      id: listings.id,
      url: listings.url,
      price: listings.price,
      status: listings.status,
    })
    .from(listings)
    .where(eq(listings.source, "streeteasy"));

  const existingByUrl = new Map(existing.map((e) => [e.url, e]));
  const fetchedUrls = new Set(items.map((f) => f.url));

  for (const item of items) {
    try {
      const score = calculateScore(item);
      const existingRow = existingByUrl.get(item.url);

      if (!existingRow) {
        await db.insert(listings).values({
          ...item,
          score,
          status: "new",
          missedScrapes: 0,
        });
        results.new++;
      } else {
        const updates: Record<string, unknown> = {
          price: item.price,
          netEffective: item.netEffective,
          sqft: item.sqft,
          noFee: item.noFee,
          newDev: item.newDev,
          hasLaundry: item.hasLaundry,
          hasElevator: item.hasElevator,
          photoCount: item.photoCount,
          score,
          lastChecked: new Date(),
          missedScrapes: 0,
        };

        if (existingRow.price && item.price < existingRow.price) {
          updates.notes = sql`COALESCE(${listings.notes}, '') || E'\n' || ${"Price dropped from $" + existingRow.price + " to $" + item.price + " on " + new Date().toLocaleDateString()}`;
        }

        if (existingRow.status === "off_market") {
          updates.status = "new";
        }

        await db
          .update(listings)
          .set(updates)
          .where(eq(listings.id, existingRow.id));
        results.updated++;
      }
    } catch (error) {
      results.errors.push(
        `${item.url}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  // Mark missing listings (not seen in this scrape)
  for (const [url, row] of existingByUrl) {
    if (
      !fetchedUrls.has(url) &&
      row.status !== "off_market" &&
      row.status !== "dismissed"
    ) {
      const current = await db
        .select({ missedScrapes: listings.missedScrapes })
        .from(listings)
        .where(eq(listings.id, row.id))
        .then((r) => r[0]?.missedScrapes ?? 0);

      const newMissed = current + 1;
      if (newMissed >= 3) {
        await db
          .update(listings)
          .set({ status: "off_market", missedScrapes: newMissed, lastChecked: new Date() })
          .where(eq(listings.id, row.id));
      } else {
        await db
          .update(listings)
          .set({ missedScrapes: newMissed, lastChecked: new Date() })
          .where(eq(listings.id, row.id));
      }
    }
  }

  // Age "new" listings >24h to "active"
  await db
    .update(listings)
    .set({ status: "active" })
    .where(
      sql`${listings.status} = 'new' AND ${listings.firstSeen} < NOW() - INTERVAL '24 hours'`
    );

  return NextResponse.json(results);
}
