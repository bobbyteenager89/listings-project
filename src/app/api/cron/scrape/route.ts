import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { listings } from "@/lib/db/schema";
import { calculateScore } from "@/lib/scoring";
import { streeteasy } from "@/lib/sources/streeteasy";
import type { NormalizedListing } from "@/lib/sources/types";
import { eq, sql } from "drizzle-orm";

const sources = [streeteasy];

export async function POST(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = { total: 0, new: 0, updated: 0, errors: [] as string[] };

  for (const source of sources) {
    try {
      const fetched = await source.fetchListings();
      results.total += fetched.length;

      // Get all existing URLs for this source
      const existing = await db
        .select({
          id: listings.id,
          url: listings.url,
          price: listings.price,
          status: listings.status,
        })
        .from(listings)
        .where(eq(listings.source, source.name));

      const existingByUrl = new Map(existing.map((e) => [e.url, e]));
      const fetchedUrls = new Set(fetched.map((f) => f.url));

      // Upsert fetched listings
      for (const item of fetched) {
        const score = calculateScore(item);
        const existingRow = existingByUrl.get(item.url);

        if (!existingRow) {
          // New listing
          await db.insert(listings).values({
            ...item,
            score,
            status: "new",
            missedScrapes: 0,
          });
          results.new++;
        } else {
          // Existing — update data, recalculate score
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

          // Detect price drop
          if (existingRow.price && item.price < existingRow.price) {
            updates.notes = sql`COALESCE(${listings.notes}, '') || E'\n' || ${"Price dropped from $" + existingRow.price + " to $" + item.price + " on " + new Date().toLocaleDateString()}`;
          }

          // Reactivate off-market listings
          if (existingRow.status === "off_market") {
            updates.status = "new";
          }

          await db
            .update(listings)
            .set(updates)
            .where(eq(listings.id, existingRow.id));
          results.updated++;
        }
      }

      // Mark missing listings
      for (const [url, row] of existingByUrl) {
        if (
          !fetchedUrls.has(url) &&
          row.status !== "off_market" &&
          row.status !== "dismissed"
        ) {
          const newMissed =
            (await db
              .select({ missedScrapes: listings.missedScrapes })
              .from(listings)
              .where(eq(listings.id, row.id))
              .then((r) => r[0]?.missedScrapes ?? 0)) + 1;

          if (newMissed >= 3) {
            await db
              .update(listings)
              .set({
                status: "off_market",
                missedScrapes: newMissed,
                lastChecked: new Date(),
              })
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
    } catch (error) {
      results.errors.push(
        `${source.name}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  const status = results.errors.length > 0 ? 500 : 200;
  return NextResponse.json(results, { status });
}
