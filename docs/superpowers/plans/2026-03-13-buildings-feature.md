# Buildings Feature Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add building-level tracking for Brooklyn studios with two-layer scraping and building cards in the dashboard.

**Architecture:** Two new DB tables (`buildings`, `building_units`) with two bookmarklets for scraping. Dashboard gets a "Buildings" filter tab that swaps the listings table for building cards with expandable unit lists.

**Tech Stack:** Next.js 15, Drizzle ORM, Neon, Tailwind 4, shadcn/ui (existing stack)

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/lib/db/schema.ts` | Modify | Add `buildings` + `building_units` tables |
| `src/app/api/buildings/route.ts` | Create | GET buildings with nested units |
| `src/app/api/buildings/ingest/route.ts` | Create | POST upsert buildings from bookmarklet |
| `src/app/api/buildings/units/ingest/route.ts` | Create | POST upsert units for a building |
| `src/components/building-card.tsx` | Create | Building card with expandable unit list |
| `src/components/buildings-list.tsx` | Create | Fetches and renders building cards |
| `src/components/filter-tabs.tsx` | Modify | Add "Buildings" tab |
| `src/app/page.tsx` | Modify | Conditionally render buildings-list vs listings-table |
| `src/app/scrape/page.tsx` | Modify | Add buildings bookmarklets + search links + ingest buttons |

---

## Chunk 1: Schema & Migration

### Task 1: Add buildings and building_units tables to schema

**Files:**
- Modify: `src/lib/db/schema.ts`

- [ ] **Step 1: Add buildings table to schema**

Add after the existing `listings` table and types:

```typescript
import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  real,
  timestamp,
  uniqueIndex,
  jsonb,
} from "drizzle-orm/pg-core";

// ... existing listings table stays unchanged ...

export const buildings = pgTable(
  "buildings",
  {
    id: serial("id").primaryKey(),
    name: text("name"),
    address: text("address"),
    neighborhood: text("neighborhood"),
    slug: text("slug").notNull(),
    url: text("url").notNull(),
    yearBuilt: integer("year_built"),
    totalUnits: integer("total_units"),
    studioCount: integer("studio_count").default(0),
    amenities: jsonb("amenities").$type<Record<string, boolean>>().default({}),
    imageUrl: text("image_url"),
    status: text("status").notNull().default("active"),
    firstSeen: timestamp("first_seen").defaultNow(),
    lastChecked: timestamp("last_checked").defaultNow(),
  },
  (table) => [uniqueIndex("buildings_slug_idx").on(table.slug)]
);

export type Building = typeof buildings.$inferSelect;
export type NewBuilding = typeof buildings.$inferInsert;

export const buildingUnits = pgTable(
  "building_units",
  {
    id: serial("id").primaryKey(),
    buildingId: integer("building_id")
      .notNull()
      .references(() => buildings.id),
    unit: text("unit"),
    price: integer("price"),
    sqft: integer("sqft"),
    beds: integer("beds").default(0),
    noFee: boolean("no_fee").default(false),
    url: text("url"),
    available: boolean("available").default(true),
    firstSeen: timestamp("first_seen").defaultNow(),
    lastSeen: timestamp("last_seen").defaultNow(),
  },
  (table) => [uniqueIndex("building_unit_idx").on(table.buildingId, table.unit)]
);

export type BuildingUnit = typeof buildingUnits.$inferSelect;
```

Note: import `jsonb` from `drizzle-orm/pg-core` (add to existing import).

- [ ] **Step 2: Generate and run migration**

```bash
cd /Users/andrew/Projects/listings-project
npx drizzle-kit generate
npx drizzle-kit migrate
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/db/schema.ts drizzle/
git commit -m "feat: add buildings and building_units schema"
```

---

## Chunk 2: Buildings API Endpoints

### Task 2: Create buildings ingest endpoint

**Files:**
- Create: `src/app/api/buildings/ingest/route.ts`

- [ ] **Step 1: Create the ingest endpoint**

```typescript
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
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/buildings/ingest/route.ts
git commit -m "feat: add buildings ingest API endpoint"
```

### Task 3: Create building units ingest endpoint

**Files:**
- Create: `src/app/api/buildings/units/ingest/route.ts`

- [ ] **Step 1: Create the units ingest endpoint**

```typescript
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

  // Find building by slug
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

  // Mark all existing units as unavailable first
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
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/buildings/units/ingest/route.ts
git commit -m "feat: add building units ingest API endpoint"
```

### Task 4: Create buildings GET endpoint

**Files:**
- Create: `src/app/api/buildings/route.ts`

- [ ] **Step 1: Create the GET endpoint**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { buildings, buildingUnits } from "@/lib/db/schema";
import { eq, and, desc, ne } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const neighborhood = params.get("neighborhood");

  // Get all active buildings
  const conditions = [ne(buildings.status, "dismissed")];
  if (neighborhood) {
    conditions.push(eq(buildings.neighborhood, neighborhood));
  }

  const rows = await db
    .select()
    .from(buildings)
    .where(and(...conditions))
    .orderBy(desc(buildings.yearBuilt), desc(buildings.studioCount));

  // Get available studio units for each building
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
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/buildings/route.ts
git commit -m "feat: add buildings GET API with nested units"
```

---

## Chunk 3: Dashboard UI

### Task 5: Create building card component

**Files:**
- Create: `src/components/building-card.tsx`

- [ ] **Step 1: Create the component**

```typescript
"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import type { Building, BuildingUnit } from "@/lib/db/schema";

type BuildingWithUnits = Building & { units: BuildingUnit[] };

const AMENITY_COLORS: Record<string, string> = {
  doorman: "bg-blue-100 text-blue-800",
  gym: "bg-green-100 text-green-800",
  roof: "bg-amber-100 text-amber-800",
  laundry: "bg-purple-100 text-purple-800",
  pool: "bg-cyan-100 text-cyan-800",
  parking: "bg-slate-100 text-slate-800",
  elevator: "bg-gray-100 text-gray-800",
  bikeRoom: "bg-orange-100 text-orange-800",
  storage: "bg-stone-100 text-stone-800",
  concierge: "bg-indigo-100 text-indigo-800",
};

const AMENITY_LABELS: Record<string, string> = {
  doorman: "Doorman",
  gym: "Gym",
  roof: "Roof",
  laundry: "Laundry",
  pool: "Pool",
  parking: "Parking",
  elevator: "Elevator",
  bikeRoom: "Bike Room",
  storage: "Storage",
  concierge: "Concierge",
};

export function BuildingCard({ building }: { building: BuildingWithUnits }) {
  const [expanded, setExpanded] = useState(false);
  const amenities = (building.amenities ?? {}) as Record<string, boolean>;
  const activeAmenities = Object.entries(amenities).filter(([, v]) => v);

  return (
    <div className="border rounded-xl p-5 hover:border-zinc-300 transition-colors">
      <div
        className="cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="text-lg font-bold">{building.name || building.address}</h3>
            <p className="text-base text-muted-foreground">
              {building.address}
              {building.neighborhood ? ` · ${building.neighborhood}` : ""}
              {building.yearBuilt ? ` · Built ${building.yearBuilt}` : ""}
            </p>
          </div>
          <div className="flex gap-1.5 flex-wrap justify-end">
            {activeAmenities.map(([key]) => (
              <span
                key={key}
                className={`px-2.5 py-0.5 rounded-full text-sm font-medium ${AMENITY_COLORS[key] ?? "bg-gray-100 text-gray-800"}`}
              >
                {AMENITY_LABELS[key] ?? key}
              </span>
            ))}
          </div>
        </div>
        <p className="text-base text-muted-foreground">
          {building.units.length} studio{building.units.length !== 1 ? "s" : ""} available
          {building.totalUnits ? ` · ${building.totalUnits} total units` : ""}
          <span className="ml-2">{expanded ? "▾" : "▸"}</span>
        </p>
      </div>

      {expanded && building.units.length > 0 && (
        <div className="mt-4 bg-muted/50 rounded-lg p-3">
          {building.units.map((unit) => (
            <div
              key={unit.id}
              className="flex justify-between items-center py-2 border-b last:border-0 text-base"
            >
              <span className="font-medium">{unit.unit || "Studio"}</span>
              <span className="text-muted-foreground">{unit.sqft ? `${unit.sqft} sqft` : "—"}</span>
              <span className="font-semibold">${unit.price?.toLocaleString()}/mo</span>
              {unit.noFee && <Badge variant="destructive" className="text-xs">No Fee</Badge>}
              {unit.url && (
                <a
                  href={unit.url}
                  target="_blank"
                  rel="noopener"
                  onClick={(e) => e.stopPropagation()}
                  className="text-blue-600 hover:underline text-sm"
                >
                  SE →
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {expanded && building.units.length === 0 && (
        <p className="mt-4 text-base text-muted-foreground italic">
          No studio units scraped yet.{" "}
          <a href={building.url} target="_blank" rel="noopener" className="text-blue-600 hover:underline">
            View on StreetEasy →
          </a>
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/components/building-card.tsx
git commit -m "feat: add BuildingCard component"
```

### Task 6: Create buildings list component

**Files:**
- Create: `src/components/buildings-list.tsx`

- [ ] **Step 1: Create the component**

```typescript
"use client";

import { useEffect, useState } from "react";
import { BuildingCard } from "./building-card";
import type { Building, BuildingUnit } from "@/lib/db/schema";

type BuildingWithUnits = Building & { units: BuildingUnit[] };

export function BuildingsList() {
  const [buildings, setBuildings] = useState<BuildingWithUnits[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/buildings")
      .then((r) => r.json())
      .then((d) => {
        setBuildings(d.buildings);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="text-muted-foreground text-base">Loading buildings...</div>;
  }

  if (buildings.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground text-base">
        No buildings yet. Use the <a href="/scrape" className="text-blue-600 hover:underline">scrape page</a> to add buildings.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {buildings.map((building) => (
        <BuildingCard key={building.id} building={building} />
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/components/buildings-list.tsx
git commit -m "feat: add BuildingsList component"
```

### Task 7: Wire buildings into dashboard

**Files:**
- Modify: `src/components/filter-tabs.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Add "Buildings" to filter tabs**

In `src/components/filter-tabs.tsx`, add to STATUS_TABS after the "Off Market" entry:

```typescript
  { label: "Off Market", value: "off_market" },
  { label: "Buildings", value: "buildings" },
```

- [ ] **Step 2: Conditionally render buildings vs listings in page.tsx**

Replace `src/app/page.tsx` with:

```typescript
import { Suspense } from "react";
import { StatsBar } from "@/components/stats-bar";
import { FilterTabs } from "@/components/filter-tabs";
import { ListingsTable } from "@/components/listings-table";
import { BuildingsList } from "@/components/buildings-list";

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const params = await searchParams;
  const isBuildings = params.status === "buildings";

  return (
    <main className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-1">Listings</h1>
          <p className="text-muted-foreground text-base">
            NYC & LA · Rentals & Sublets
          </p>
        </div>
        <a
          href="/scrape"
          className="text-base text-blue-600 hover:underline"
        >
          Scrape →
        </a>
      </div>

      {!isBuildings && (
        <Suspense fallback={<div className="text-muted-foreground">Loading stats...</div>}>
          <StatsBar />
        </Suspense>
      )}

      <Suspense fallback={null}>
        <FilterTabs />
      </Suspense>

      {isBuildings ? (
        <Suspense fallback={<div className="text-muted-foreground">Loading buildings...</div>}>
          <BuildingsList />
        </Suspense>
      ) : (
        <Suspense fallback={<div className="text-muted-foreground">Loading listings...</div>}>
          <ListingsTable />
        </Suspense>
      )}
    </main>
  );
}
```

Note: `page.tsx` needs `searchParams` as a prop to detect the `buildings` filter. Next.js 15 app router passes this as a Promise for async server components.

- [ ] **Step 3: Verify build**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/components/filter-tabs.tsx src/app/page.tsx
git commit -m "feat: wire buildings view into dashboard"
```

---

## Chunk 4: Scrape Page & Bookmarklets

### Task 8: Add buildings bookmarklets and scrape UI

**Files:**
- Modify: `src/app/scrape/page.tsx`

- [ ] **Step 1: Add buildings bookmarklet code and search links**

Add these constants near the top of `src/app/scrape/page.tsx` (after existing bookmarklet constants):

```typescript
// StreetEasy building search bookmarklet — extracts building cards from search results
const SE_BUILDINGS_BOOKMARKLET = `javascript:void(${encodeURIComponent(`(function(){var cards=document.querySelectorAll('[class*="buildingCard"],.listingCard,[data-testid="building-card"]');if(!cards.length){cards=document.querySelectorAll('a[href*="/building/"]')}if(!cards.length){alert('No buildings found. Try selecting building cards manually.');return}var seen=new Set(),r=[];cards.forEach(function(card){var a=card.tagName==='A'?card:card.querySelector('a[href*="/building/"]');if(!a)return;var hr=a.href.split('?')[0];var sl=hr.split('/building/')[1];if(!sl||seen.has(sl))return;seen.add(sl);var t=card.innerText||'';var ls=t.split('\\n').map(function(l){return l.trim()}).filter(Boolean);var img=card.querySelector('img');var nm=ls[0]||sl.replace(/-/g,' ');var addr=ls.find(function(l){return l.match(/\\d+\\s/)&&!l.startsWith('$')})||'';var hood=ls.find(function(l){return['park slope','carroll gardens','cobble hill','brooklyn heights','boerum hill','gowanus','fort greene','prospect heights','downtown brooklyn','clinton hill','red hook','dumbo','williamsburg','greenpoint','bushwick','bed-stuy','crown heights'].some(function(n){return l.toLowerCase().includes(n)})})||'';var yb=t.match(/(?:built|year built|constructed)[:\\s]*(\\d{4})/i);var yr=yb?parseInt(yb[1]):null;if(!yr){var ym=t.match(/\\b(202[4-9]|20[3-9]\\d)\\b/);yr=ym?parseInt(ym[0]):null}var tu=t.match(/(\\d+)\\s*(?:units|unit)/i);r.push({name:nm,address:addr,neighborhood:hood.toLowerCase(),slug:sl,url:hr,yearBuilt:yr,totalUnits:tu?parseInt(tu[1]):null,imageUrl:img?img.src:null})});navigator.clipboard.writeText(JSON.stringify({buildings:r})).then(function(){alert('Copied '+r.length+' buildings!')}).catch(function(){prompt('Copy:',JSON.stringify({buildings:r}))})})()`)})`;

// StreetEasy building page bookmarklet — extracts units + amenities from individual building page
const SE_UNITS_BOOKMARKLET = `javascript:void(${encodeURIComponent(`(function(){var sl=window.location.pathname.split('/building/')[1];if(!sl){alert('Not a building page');return}sl=sl.split('/')[0].split('?')[0];var units=[],rows=document.querySelectorAll('[class*="listingCard"],[class*="UnitCard"],table tr,[data-testid*="unit"]');rows.forEach(function(row){var a=row.querySelector('a[href*="/rental/"]')||row.querySelector('a[href]');if(!a)return;var t=row.innerText||'';var pl=t.match(/\\$([\\d,]+)/);var pr=pl?parseInt(pl[1].replace(/,/g,'')):0;if(!pr)return;var ul=a.href.split('?')[0];var un=t.match(/#?([A-Z0-9]+[A-Z]|\\d+[A-Z])/i);var sf=t.match(/(\\d{2,4})\\s*(?:ft|sf|sqft)/i);var bd=t.match(/(\\d+)\\s*(?:bed|br)/i);var isStudio=t.toLowerCase().includes('studio');var nf=t.toLowerCase().includes('no fee');units.push({unit:un?un[1]:'',price:pr,sqft:sf?parseInt(sf[1]):null,beds:isStudio?0:bd?parseInt(bd[1]):0,noFee:nf,url:ul})});var am={};var at=document.body.innerText.toLowerCase();['doorman','gym','roof','laundry','pool','parking','elevator','bike room','storage','concierge'].forEach(function(a){am[a==='bike room'?'bikeRoom':a]=at.includes(a)});navigator.clipboard.writeText(JSON.stringify({slug:sl,amenities:am,units:units})).then(function(){alert('Copied '+units.length+' units for '+sl)}).catch(function(){prompt('Copy:',JSON.stringify({slug:sl,amenities:am,units:units}))})})()`)})`;

function seBuildingSearchUrl(slug: string) {
  return `https://streeteasy.com/buildings/${slug}?type=rental&built_after=2023`;
}
```

- [ ] **Step 2: Add bookmarklet buttons and building search links to the UI**

After the existing Step 1 bookmarklet section, add the buildings bookmarklets:

In the bookmarklet drag section (after the LP Extract button), add:

```tsx
<a
  href={SE_BUILDINGS_BOOKMARKLET}
  className="inline-block px-4 py-2 bg-violet-700 text-white rounded-lg text-sm font-medium hover:bg-violet-600 cursor-grab active:cursor-grabbing"
  onClick={(e) => e.preventDefault()}
>
  SE Buildings
</a>
<a
  href={SE_UNITS_BOOKMARKLET}
  className="inline-block px-4 py-2 bg-teal-700 text-white rounded-lg text-sm font-medium hover:bg-teal-600 cursor-grab active:cursor-grabbing"
  onClick={(e) => e.preventDefault()}
>
  SE Units
</a>
```

After the existing neighborhood search links sections, add:

```tsx
<div className="space-y-2">
  <h3 className="text-sm font-medium text-zinc-700">StreetEasy — Building Search</h3>
  <div className="flex gap-2 flex-wrap">
    {SE_BROOKLYN.map((s) => (
      <a key={`bldg-${s.slug}`} href={seBuildingSearchUrl(s.slug)} target="_blank" rel="noopener noreferrer"
        className="text-xs px-3 py-1.5 bg-violet-50 text-violet-700 rounded-md hover:bg-violet-100 font-medium">
        {s.label} Buildings ↗
      </a>
    ))}
  </div>
</div>
```

- [ ] **Step 3: Add auto-detect paste logic**

Replace the existing `handlePaste` function with one that auto-detects the format. When the clipboard JSON contains a `buildings` key, POST to `/api/buildings/ingest`. When it contains `slug` + `units`, POST to `/api/buildings/units/ingest`. Otherwise, treat as listings (existing behavior).

```typescript
async function handlePaste() {
  if (!secret) {
    log("Enter your CRON_SECRET first", "error");
    return;
  }
  try {
    const text = await navigator.clipboard.readText();
    const data = JSON.parse(text);

    if (data.buildings && Array.isArray(data.buildings)) {
      // Building search results
      log(`Found ${data.buildings.length} buildings in clipboard, sending...`);
      const res = await fetch("/api/buildings/ingest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${secret}`,
        },
        body: text,
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      log(`${result.new} new, ${result.updated} updated buildings`, "success");
    } else if (data.slug && Array.isArray(data.units)) {
      // Individual building units
      log(`Found ${data.units.length} units for ${data.slug}, sending...`);
      const res = await fetch("/api/buildings/units/ingest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${secret}`,
        },
        body: text,
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      log(`${result.new} new, ${result.updated} updated units`, "success");
    } else if (Array.isArray(data)) {
      // Listings (existing behavior)
      log(`Found ${data.length} listings in clipboard, sending...`);
      const res = await fetch("/api/scrape/ingest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${secret}`,
        },
        body: JSON.stringify({ listings: data }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      log(
        `${result.new} new, ${result.updated} updated out of ${result.total}`,
        "success"
      );
    } else {
      log("Unrecognized clipboard format", "error");
    }
  } catch (e) {
    log(
      `Failed: ${e instanceof Error ? e.message : String(e)}`,
      "error"
    );
  }
}
```

- [ ] **Step 4: Verify build**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add src/app/scrape/page.tsx
git commit -m "feat: add buildings bookmarklets and auto-detect ingest"
```

---

## Chunk 5: Push & Verify

### Task 9: Final verification and push

- [ ] **Step 1: Full build check**

```bash
cd /Users/andrew/Projects/listings-project
npm run build
```

- [ ] **Step 2: Push all commits**

```bash
git push
```

- [ ] **Step 3: Verify live site**

Check https://listings-project.vercel.app after deploy:
- "Buildings" tab appears in filter tabs
- Clicking it shows empty state with link to scrape page
- Scrape page shows new bookmarklets and building search links
- Paste & Ingest auto-detects format
