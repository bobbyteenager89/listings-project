import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { buildings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

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
  const items = body.buildings;

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json(
      { error: "No buildings provided" },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  const results = { total: items.length, new: 0, updated: 0 };

  for (const item of items) {
    const existing = await db
      .select({ id: buildings.id })
      .from(buildings)
      .where(eq(buildings.slug, item.slug))
      .then((r) => r[0]);

    if (!existing) {
      await db.insert(buildings).values({
        name: item.name,
        address: item.address,
        neighborhood: item.neighborhood,
        slug: item.slug,
        url: item.url,
        yearBuilt: item.yearBuilt,
        totalUnits: item.totalUnits,
        imageUrl: item.imageUrl,
      });
      results.new++;
    } else {
      await db
        .update(buildings)
        .set({
          name: item.name,
          address: item.address,
          yearBuilt: item.yearBuilt,
          totalUnits: item.totalUnits,
          imageUrl: item.imageUrl,
          lastChecked: new Date(),
        })
        .where(eq(buildings.id, existing.id));
      results.updated++;
    }
  }

  return NextResponse.json(results, { headers: CORS_HEADERS });
}
