import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { listings } from "@/lib/db/schema";
import { eq, desc, asc, and, gte, lte, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  const status = params.get("status");
  const city = params.get("city");
  const listingType = params.get("listingType");
  const neighborhood = params.get("neighborhood");
  const minPrice = params.get("minPrice");
  const maxPrice = params.get("maxPrice");
  const sortBy = params.get("sortBy") ?? "score";
  const sortDir = params.get("sortDir") ?? "desc";
  const page = parseInt(params.get("page") ?? "1");
  const limit = parseInt(params.get("limit") ?? "20");
  const offset = (page - 1) * limit;

  // Build where conditions
  const conditions = [];
  if (status) {
    conditions.push(eq(listings.status, status));
  } else {
    // Default view: hide off_market listings
    conditions.push(sql`${listings.status} != 'off_market'`);
  }
  if (city) {
    conditions.push(eq(listings.city, city));
  }
  if (listingType) {
    conditions.push(eq(listings.listingType, listingType));
  }
  if (neighborhood) {
    conditions.push(eq(listings.neighborhood, neighborhood));
  }
  if (minPrice) {
    conditions.push(gte(listings.price, parseInt(minPrice)));
  }
  if (maxPrice) {
    conditions.push(lte(listings.price, parseInt(maxPrice)));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  // Build sort
  const sortColumn = {
    score: listings.score,
    price: listings.price,
    date: listings.firstSeen,
    sqft: listings.sqft,
    neighborhood: listings.neighborhood,
  }[sortBy] ?? listings.score;

  const orderFn = sortDir === "asc" ? asc : desc;

  // Query
  const [rows, countResult] = await Promise.all([
    db
      .select()
      .from(listings)
      .where(where)
      .orderBy(orderFn(sortColumn), desc(listings.firstSeen))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(listings)
      .where(where),
  ]);

  return NextResponse.json({
    listings: rows,
    total: countResult[0].count,
    page,
    limit,
  });
}
