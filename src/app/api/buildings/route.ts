import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { buildings, buildingUnits } from "@/lib/db/schema";
import { eq, and, desc, ne } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const neighborhood = params.get("neighborhood");

  const conditions = [ne(buildings.status, "dismissed")];
  if (neighborhood) {
    conditions.push(eq(buildings.neighborhood, neighborhood));
  }

  const rows = await db
    .select()
    .from(buildings)
    .where(and(...conditions))
    .orderBy(desc(buildings.yearBuilt), desc(buildings.studioCount));

  const result = await Promise.all(
    rows.map(async (building) => {
      const units = await db
        .select()
        .from(buildingUnits)
        .where(
          and(
            eq(buildingUnits.buildingId, building.id),
            eq(buildingUnits.beds, 0),
            eq(buildingUnits.available, true)
          )
        )
        .orderBy(buildingUnits.price);

      return { ...building, units };
    })
  );

  return NextResponse.json({ buildings: result });
}
