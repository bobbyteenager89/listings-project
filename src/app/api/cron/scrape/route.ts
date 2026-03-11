import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { listings } from "@/lib/db/schema";
import { sql } from "drizzle-orm";

// Cron job: age "new" listings to "active" after 24h
// Actual scraping is done via browser bookmarklet → /api/scrape/ingest
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Age "new" listings >24h to "active"
  const aged = await db
    .update(listings)
    .set({ status: "active" })
    .where(
      sql`${listings.status} = 'new' AND ${listings.firstSeen} < NOW() - INTERVAL '24 hours'`
    )
    .returning({ id: listings.id });

  return NextResponse.json({ aged: aged.length });
}
