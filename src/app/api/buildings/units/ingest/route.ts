import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { buildings, buildingUnits } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: CORS_HEADERS }
    );
  }

  const body = await request.json();
  const { slug, amenities, units } = body;

  if (!slug || !Array.isArray(units)) {
    return NextResponse.json(
      { error: "Missing slug or units array" },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  const building = await db
    .select({ id: buildings.id })
    .from(buildings)
    .where(eq(buildings.slug, slug))
    .then((r) => r[0]);

  if (!building) {
    return NextResponse.json(
      { error: `Building not found: ${slug}` },
      { status: 404, headers: CORS_HEADERS }
    );
  }

  // Mark all existing units as unavailable
  await db
    .update(buildingUnits)
    .set({ available: false })
    .where(eq(buildingUnits.buildingId, building.id));

  const results = { total: units.length, new: 0, updated: 0 };

  for (const u of units) {
    const existing = await db
      .select({ id: buildingUnits.id })
      .from(buildingUnits)
      .where(
        and(
          eq(buildingUnits.buildingId, building.id),
          eq(buildingUnits.unit, u.unit)
        )
      )
      .then((r) => r[0]);

    if (!existing) {
      await db.insert(buildingUnits).values({
        buildingId: building.id,
        unit: u.unit,
        price: u.price,
        sqft: u.sqft,
        beds: u.beds ?? 0,
        noFee: u.noFee ?? false,
        url: u.url,
        available: true,
      });
      results.new++;
    } else {
      await db
        .update(buildingUnits)
        .set({
          price: u.price,
          sqft: u.sqft,
          beds: u.beds ?? 0,
          noFee: u.noFee ?? false,
          url: u.url,
          available: true,
          lastSeen: new Date(),
        })
        .where(eq(buildingUnits.id, existing.id));
      results.updated++;
    }
  }

  // Update building: amenities, studioCount, lastChecked
  const studioCountResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(buildingUnits)
    .where(
      and(
        eq(buildingUnits.buildingId, building.id),
        eq(buildingUnits.beds, 0),
        eq(buildingUnits.available, true)
      )
    );

  await db
    .update(buildings)
    .set({
      amenities: amenities ?? {},
      studioCount: studioCountResult[0].count,
      lastChecked: new Date(),
    })
    .where(eq(buildings.id, building.id));

  return NextResponse.json(results, { headers: CORS_HEADERS });
}
