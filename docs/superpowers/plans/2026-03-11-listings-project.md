# Listings Project Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a personal apartment listing tracker that scrapes StreetEasy via Apify every 4 hours, scores listings, and presents them in a sortable table dashboard.

**Architecture:** Vercel Cron triggers a scrape route that calls Apify, normalizes results, upserts into Neon with scoring. Dashboard reads from Neon and renders a filterable/sortable table with triage actions (favorite, dismiss, notes).

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind 4, shadcn/ui, Drizzle ORM, Neon (Postgres), Apify, Vercel Cron

**Spec:** `docs/superpowers/specs/2026-03-11-listings-project-design.md`

---

## File Structure

```
listings-project/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout (dark theme, fonts)
│   │   ├── page.tsx                # Dashboard page (server component)
│   │   ├── api/
│   │   │   ├── listings/
│   │   │   │   └── route.ts        # GET /api/listings
│   │   │   ├── listings/
│   │   │   │   └── [id]/
│   │   │   │       └── route.ts    # PATCH /api/listings/[id]
│   │   │   └── cron/
│   │   │       └── scrape/
│   │   │           └── route.ts    # POST /api/cron/scrape
│   │   └── globals.css             # Tailwind base styles
│   ├── components/
│   │   ├── listings-table.tsx      # Client component: sortable table
│   │   ├── filter-tabs.tsx         # Client component: All/New/Favorites/Dismissed
│   │   ├── stats-bar.tsx           # Server component: counts + last scraped
│   │   └── listing-row.tsx         # Client component: expandable row with actions
│   ├── lib/
│   │   ├── db/
│   │   │   ├── schema.ts           # Drizzle schema (listings table)
│   │   │   ├── index.ts            # Drizzle client + Neon connection
│   │   │   └── migrate.ts          # Migration runner
│   │   ├── scoring.ts              # Score calculation function
│   │   └── sources/
│   │       ├── types.ts            # ListingSource interface + NormalizedListing type
│   │       └── streeteasy.ts       # StreetEasy Apify adapter
├── drizzle/                        # Generated migration files
├── drizzle.config.ts               # Drizzle Kit config
├── vercel.json                     # Cron config
├── .env.local                      # DATABASE_URL, APIFY_TOKEN, CRON_SECRET
├── package.json
├── tsconfig.json
├── next.config.ts
├── postcss.config.mjs
├── tailwind.config.ts              # (if needed beyond CSS-first)
└── CLAUDE.md                       # Project docs
```

---

## Chunk 1: Project Scaffold + Database

### Task 1: Initialize Next.js project

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`

- [ ] **Step 1: Create Next.js app**

```bash
cd /Users/andrew/Projects/listings-project
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-git
```

Accept defaults. This scaffolds into the existing directory.

- [ ] **Step 2: Install dependencies**

```bash
npm install drizzle-orm @neondatabase/serverless
npm install -D drizzle-kit
npm install apify-client
```

- [ ] **Step 3: Install shadcn/ui**

```bash
npx shadcn@latest init
```

Select: New York style, Zinc color, CSS variables: yes.

Then add table and button components:

```bash
npx shadcn@latest add table button badge tabs input
```

- [ ] **Step 4: Create CLAUDE.md**

```markdown
# Listings Project

## Overview
Personal apartment listing tracker. Scrapes StreetEasy via Apify, scores listings, dashboard for triage.

## Tech Stack
Next.js 15 · React 19 · TypeScript · Tailwind 4 · shadcn/ui · Drizzle ORM · Neon · Apify · Vercel Cron

## Commands
- `npm run dev` — local dev server
- `npm run build` — production build
- `npx drizzle-kit generate` — generate migrations
- `npx drizzle-kit migrate` — run migrations
- `npx drizzle-kit studio` — Drizzle Studio (DB browser)

## Structure
- `src/lib/db/schema.ts` — Drizzle schema
- `src/lib/scoring.ts` — Listing score calculator
- `src/lib/sources/` — Scraping adapters (one per listing source)
- `src/app/api/cron/scrape/` — Cron endpoint
- `src/app/api/listings/` — Listings CRUD API
- `src/app/page.tsx` — Dashboard

## Environment Variables
- `DATABASE_URL` — Neon connection string (from Vercel integration)
- `APIFY_TOKEN` — Apify API token
- `CRON_SECRET` — Vercel Cron auth secret
```

- [ ] **Step 5: Create .env.local placeholder**

```env
DATABASE_URL=
APIFY_TOKEN=
CRON_SECRET=
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: initialize Next.js project with dependencies"
```

---

### Task 2: Database schema + Drizzle setup

**Files:**
- Create: `src/lib/db/schema.ts`, `src/lib/db/index.ts`, `drizzle.config.ts`

- [ ] **Step 1: Create Drizzle config**

Create `drizzle.config.ts`:

```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

- [ ] **Step 2: Create DB schema**

Create `src/lib/db/schema.ts`:

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
} from "drizzle-orm/pg-core";

export const listings = pgTable(
  "listings",
  {
    id: serial("id").primaryKey(),
    source: text("source").notNull().default("streeteasy"),
    sourceId: text("source_id"),
    url: text("url").notNull(),
    address: text("address"),
    unit: text("unit"),
    neighborhood: text("neighborhood"),
    price: integer("price"),
    netEffective: integer("net_effective"),
    sqft: integer("sqft"),
    noFee: boolean("no_fee").default(false),
    newDev: boolean("new_dev").default(false),
    hasLaundry: boolean("has_laundry").default(false),
    hasElevator: boolean("has_elevator").default(false),
    photoCount: integer("photo_count").default(0),
    score: real("score").default(0),
    status: text("status").notNull().default("new"),
    missedScrapes: integer("missed_scrapes").default(0),
    firstSeen: timestamp("first_seen").defaultNow(),
    lastChecked: timestamp("last_checked").defaultNow(),
    notes: text("notes"),
  },
  (table) => [uniqueIndex("url_idx").on(table.url)]
);

export type Listing = typeof listings.$inferSelect;
export type NewListing = typeof listings.$inferInsert;
```

- [ ] **Step 3: Create DB connection**

Create `src/lib/db/index.ts`:

```typescript
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });
```

- [ ] **Step 4: Generate and verify migration**

```bash
npx drizzle-kit generate
```

Expected: Creates a migration file in `drizzle/` directory.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add Drizzle schema and DB connection for listings table"
```

---

### Task 3: Scoring function

**Files:**
- Create: `src/lib/scoring.ts`

- [ ] **Step 1: Create scoring module**

Create `src/lib/scoring.ts`:

```typescript
const PREFERRED_NEIGHBORHOODS = new Set([
  "carroll gardens",
  "cobble hill",
  "brooklyn heights",
  "boerum hill",
  "park slope",
  "fort greene",
  "prospect heights",
  "gowanus",
  "red hook",
]);

interface ScoreInput {
  price: number | null;
  netEffective: number | null;
  sqft: number | null;
  noFee: boolean;
  newDev: boolean;
  hasLaundry: boolean;
  hasElevator: boolean;
  photoCount: number;
  neighborhood: string | null;
}

export function calculateScore(input: ScoreInput): number {
  let score = 0;
  const effectivePrice = input.netEffective ?? input.price ?? 9999;

  // Price (0-4 pts)
  if (effectivePrice <= 2500) score += 4;
  else if (effectivePrice <= 2800) score += 3;
  else if (effectivePrice <= 3000) score += 2;
  else if (effectivePrice <= 3200) score += 1;

  // Space (0-2 pts)
  if (input.sqft && input.sqft >= 600) score += 2;
  else if (input.sqft && input.sqft >= 450) score += 1;

  // Perks
  if (input.noFee) score += 2;
  if (input.hasLaundry) score += 3;
  if (input.hasElevator) score += 1;
  if (input.newDev) score += 1;

  // Preferred neighborhood
  if (
    input.neighborhood &&
    PREFERRED_NEIGHBORHOODS.has(input.neighborhood.toLowerCase())
  )
    score += 1;

  // Penalties
  if (input.photoCount === 0) score -= 3;

  return score;
}
```

- [ ] **Step 2: Verify it compiles**

```bash
npx tsc --noEmit src/lib/scoring.ts
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/scoring.ts
git commit -m "feat: add listing scoring algorithm"
```

---

## Chunk 2: Scraping Layer + Cron

### Task 4: Source types + StreetEasy adapter

**Files:**
- Create: `src/lib/sources/types.ts`, `src/lib/sources/streeteasy.ts`

- [ ] **Step 1: Create source types**

Create `src/lib/sources/types.ts`:

```typescript
export interface NormalizedListing {
  source: string;
  sourceId: string;
  url: string;
  address: string;
  unit: string | null;
  neighborhood: string;
  price: number;
  netEffective: number | null;
  sqft: number | null;
  noFee: boolean;
  newDev: boolean;
  hasLaundry: boolean;
  hasElevator: boolean;
  photoCount: number;
}

export interface ListingSource {
  name: string;
  fetchListings(): Promise<NormalizedListing[]>;
}
```

- [ ] **Step 2: Create StreetEasy Apify adapter**

Create `src/lib/sources/streeteasy.ts`:

```typescript
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
    sqft: item.squareFeet ?? item.livingAreaSize
      ? Number(item.squareFeet ?? item.livingAreaSize)
      : null,
    noFee: Boolean(item.noFee),
    newDev: Boolean(item.isNewDevelopment ?? item.newDev),
    hasLaundry: amenities.includes("laundry") || amenities.includes("washer"),
    hasElevator: amenities.includes("elevator"),
    photoCount: Number(item.photoCount ?? item.mediaAssetCount ?? 0),
  };
}
```

Note: The `normalizeItem` function maps multiple possible field names because the Apify actor's output schema may vary. We handle both camelCase and snake_case.

- [ ] **Step 3: Commit**

```bash
git add src/lib/sources/
git commit -m "feat: add source types and StreetEasy Apify adapter"
```

---

### Task 5: Cron scrape endpoint

**Files:**
- Create: `src/app/api/cron/scrape/route.ts`, `vercel.json`

- [ ] **Step 1: Create cron route**

Create `src/app/api/cron/scrape/route.ts`:

```typescript
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
        .select({ id: listings.id, url: listings.url, price: listings.price, status: listings.status })
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
        if (!fetchedUrls.has(url) && row.status !== "off_market" && row.status !== "dismissed") {
          const newMissed = (await db
            .select({ missedScrapes: listings.missedScrapes })
            .from(listings)
            .where(eq(listings.id, row.id))
            .then((r) => r[0]?.missedScrapes ?? 0)) + 1;

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
    } catch (error) {
      results.errors.push(
        `${source.name}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  const status = results.errors.length > 0 ? 500 : 200;
  return NextResponse.json(results, { status });
}
```

- [ ] **Step 2: Create vercel.json with cron config**

Create `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/scrape",
      "schedule": "0 2,6,10,14,18,22 * * *"
    }
  ]
}
```

This runs at 2am, 6am, 10am, 2pm, 6pm, 10pm UTC (roughly every 4 hours).

- [ ] **Step 3: Commit**

```bash
git add src/app/api/cron/ vercel.json
git commit -m "feat: add cron scrape endpoint with Apify integration"
```

---

## Chunk 3: API Routes

### Task 6: GET /api/listings

**Files:**
- Create: `src/app/api/listings/route.ts`

- [ ] **Step 1: Create listings GET route**

Create `src/app/api/listings/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { listings } from "@/lib/db/schema";
import { eq, desc, asc, and, gte, lte, sql, or } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  const status = params.get("status"); // new, active, favorite, dismissed, off_market
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
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/listings/route.ts
git commit -m "feat: add GET /api/listings with filtering, sorting, pagination"
```

---

### Task 7: PATCH /api/listings/[id]

**Files:**
- Create: `src/app/api/listings/[id]/route.ts`

- [ ] **Step 1: Create PATCH route**

Create `src/app/api/listings/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { listings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const updates: Record<string, unknown> = {};

  if (body.status && ["new", "active", "favorite", "dismissed"].includes(body.status)) {
    updates.status = body.status;
  }

  if (body.notes !== undefined) {
    updates.notes = body.notes;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid updates" }, { status: 400 });
  }

  const result = await db
    .update(listings)
    .set(updates)
    .where(eq(listings.id, parseInt(id)))
    .returning();

  if (result.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(result[0]);
}
```

- [ ] **Step 2: Commit**

```bash
git add "src/app/api/listings/[id]/route.ts"
git commit -m "feat: add PATCH /api/listings/[id] for status and notes updates"
```

---

## Chunk 4: Dashboard UI

### Task 8: Stats bar component

**Files:**
- Create: `src/components/stats-bar.tsx`

- [ ] **Step 1: Create stats bar**

Create `src/components/stats-bar.tsx`:

```typescript
import { db } from "@/lib/db";
import { listings } from "@/lib/db/schema";
import { eq, sql, and, gte } from "drizzle-orm";

export async function StatsBar() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [stats] = await db
    .select({
      total: sql<number>`count(*) filter (where ${listings.status} != 'off_market' and ${listings.status} != 'dismissed')`,
      newToday: sql<number>`count(*) filter (where ${listings.firstSeen} >= ${today})`,
      favorites: sql<number>`count(*) filter (where ${listings.status} = 'favorite')`,
      lastScraped: sql<Date>`max(${listings.lastChecked})`,
    })
    .from(listings);

  const lastScrapedText = stats.lastScraped
    ? formatRelativeTime(stats.lastScraped)
    : "Never";

  return (
    <div className="flex items-center gap-6 text-sm text-muted-foreground border-b pb-3 mb-4">
      <span>
        <strong className="text-foreground">{stats.total}</strong> active
      </span>
      <span>
        <strong className="text-foreground">{stats.newToday}</strong> new today
      </span>
      <span>
        <strong className="text-foreground">{stats.favorites}</strong> favorites
      </span>
      <span>Last scraped: {lastScrapedText}</span>
    </div>
  );
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/stats-bar.tsx
git commit -m "feat: add stats bar component"
```

---

### Task 9: Filter tabs component

**Files:**
- Create: `src/components/filter-tabs.tsx`

- [ ] **Step 1: Create filter tabs**

Create `src/components/filter-tabs.tsx`:

```typescript
"use client";

import { useRouter, useSearchParams } from "next/navigation";

const TABS = [
  { label: "All", value: "" },
  { label: "New", value: "new" },
  { label: "Favorites", value: "favorite" },
  { label: "Dismissed", value: "dismissed" },
];

export function FilterTabs() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentStatus = searchParams.get("status") ?? "";

  function handleTabClick(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("status", value);
    } else {
      params.delete("status");
    }
    params.delete("page"); // reset to page 1
    router.push(`/?${params.toString()}`);
  }

  return (
    <div className="flex gap-1 mb-4">
      {TABS.map((tab) => (
        <button
          key={tab.value}
          onClick={() => handleTabClick(tab.value)}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            currentStatus === tab.value
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/filter-tabs.tsx
git commit -m "feat: add filter tabs component"
```

---

### Task 10: Listing row component

**Files:**
- Create: `src/components/listing-row.tsx`

- [ ] **Step 1: Create expandable listing row**

Create `src/components/listing-row.tsx`:

```typescript
"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import type { Listing } from "@/lib/db/schema";

export function ListingRow({ listing }: { listing: Listing }) {
  const [expanded, setExpanded] = useState(false);
  const [status, setStatus] = useState(listing.status);
  const [notes, setNotes] = useState(listing.notes ?? "");
  const [saving, setSaving] = useState(false);

  async function updateStatus(newStatus: string) {
    setSaving(true);
    await fetch(`/api/listings/${listing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    setStatus(newStatus);
    setSaving(false);
  }

  async function saveNotes() {
    setSaving(true);
    await fetch(`/api/listings/${listing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });
    setSaving(false);
  }

  const isDismissed = status === "dismissed";
  const price = listing.netEffective ?? listing.price;

  return (
    <>
      <TableRow
        onClick={() => setExpanded(!expanded)}
        className={`cursor-pointer ${isDismissed ? "opacity-40 line-through" : ""}`}
      >
        <TableCell>
          <a
            href={listing.url}
            target="_blank"
            rel="noopener"
            onClick={(e) => e.stopPropagation()}
            className="text-primary hover:underline"
          >
            {listing.address}
            {listing.unit ? ` #${listing.unit}` : ""}
          </a>
        </TableCell>
        <TableCell>{listing.neighborhood}</TableCell>
        <TableCell className="font-semibold">
          ${price?.toLocaleString()}
          {listing.netEffective && listing.netEffective !== listing.price && (
            <span className="text-xs text-muted-foreground ml-1">
              (net)
            </span>
          )}
        </TableCell>
        <TableCell>{listing.sqft ?? "—"}</TableCell>
        <TableCell>
          <div className="flex gap-1 flex-wrap">
            {listing.noFee && <Badge variant="destructive">No Fee</Badge>}
            {listing.hasLaundry && <Badge className="bg-green-600">Laundry</Badge>}
            {listing.hasElevator && <Badge variant="secondary">Elevator</Badge>}
            {listing.newDev && <Badge variant="outline">New Dev</Badge>}
          </div>
        </TableCell>
        <TableCell className="font-mono">{listing.score?.toFixed(1)}</TableCell>
        <TableCell onClick={(e) => e.stopPropagation()}>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant={status === "favorite" ? "default" : "ghost"}
              onClick={() =>
                updateStatus(status === "favorite" ? "active" : "favorite")
              }
              disabled={saving}
            >
              ★
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                updateStatus(status === "dismissed" ? "active" : "dismissed")
              }
              disabled={saving}
            >
              ✕
            </Button>
          </div>
        </TableCell>
      </TableRow>
      {expanded && (
        <TableRow>
          <TableCell colSpan={7} className="bg-muted/50 p-4">
            <div className="grid gap-2 text-sm">
              <div>
                <strong>First seen:</strong>{" "}
                {listing.firstSeen
                  ? new Date(listing.firstSeen).toLocaleDateString()
                  : "—"}
              </div>
              <div>
                <strong>Photos:</strong> {listing.photoCount ?? 0}
              </div>
              <div>
                <strong>Source:</strong> {listing.source}
              </div>
              <div>
                <label className="font-semibold block mb-1">Notes:</label>
                <textarea
                  className="w-full p-2 rounded border bg-background text-sm min-h-[60px]"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  onBlur={saveNotes}
                  placeholder="Add personal notes..."
                />
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/listing-row.tsx
git commit -m "feat: add expandable listing row with favorite/dismiss/notes"
```

---

### Task 11: Listings table + Dashboard page

**Files:**
- Create: `src/components/listings-table.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Create listings table**

Create `src/components/listings-table.tsx`:

```typescript
"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ListingRow } from "./listing-row";
import { Button } from "@/components/ui/button";
import type { Listing } from "@/lib/db/schema";

const SORT_OPTIONS = [
  { label: "Score", value: "score" },
  { label: "Price", value: "price" },
  { label: "Date", value: "date" },
  { label: "Sqft", value: "sqft" },
  { label: "Neighborhood", value: "neighborhood" },
];

export function ListingsTable() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [data, setData] = useState<{ listings: Listing[]; total: number }>({
    listings: [],
    total: 0,
  });
  const [loading, setLoading] = useState(true);

  const status = searchParams.get("status") ?? "";
  const sortBy = searchParams.get("sortBy") ?? "score";
  const sortDir = searchParams.get("sortDir") ?? "desc";
  const page = parseInt(searchParams.get("page") ?? "1");

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    params.set("sortBy", sortBy);
    params.set("sortDir", sortDir);
    params.set("page", String(page));

    fetch(`/api/listings?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      });
  }, [status, sortBy, sortDir, page]);

  function toggleSort(column: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (sortBy === column) {
      params.set("sortDir", sortDir === "desc" ? "asc" : "desc");
    } else {
      params.set("sortBy", column);
      params.set("sortDir", "desc");
    }
    router.push(`/?${params.toString()}`);
  }

  function goToPage(p: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    router.push(`/?${params.toString()}`);
  }

  const totalPages = Math.ceil(data.total / 20);

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            {[
              { label: "Address", value: "address", sortable: false },
              { label: "Neighborhood", value: "neighborhood", sortable: true },
              { label: "Price", value: "price", sortable: true },
              { label: "Sqft", value: "sqft", sortable: true },
              { label: "Tags", value: "tags", sortable: false },
              { label: "Score", value: "score", sortable: true },
              { label: "Actions", value: "actions", sortable: false },
            ].map((col) => (
              <TableHead
                key={col.value}
                className={col.sortable ? "cursor-pointer select-none" : ""}
                onClick={() => col.sortable && toggleSort(col.value)}
              >
                {col.label}
                {sortBy === col.value && (
                  <span className="ml-1">{sortDir === "desc" ? "↓" : "↑"}</span>
                )}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <td colSpan={7} className="text-center py-8 text-muted-foreground">
                Loading...
              </td>
            </TableRow>
          ) : data.listings.length === 0 ? (
            <TableRow>
              <td colSpan={7} className="text-center py-8 text-muted-foreground">
                No listings found
              </td>
            </TableRow>
          ) : (
            data.listings.map((listing) => (
              <ListingRow key={listing.id} listing={listing} />
            ))
          )}
        </TableBody>
      </Table>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => goToPage(page - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => goToPage(page + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Update dashboard page**

Replace `src/app/page.tsx`:

```typescript
import { Suspense } from "react";
import { StatsBar } from "@/components/stats-bar";
import { FilterTabs } from "@/components/filter-tabs";
import { ListingsTable } from "@/components/listings-table";

export default function Dashboard() {
  return (
    <main className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-1">Listings</h1>
      <p className="text-muted-foreground text-sm mb-6">
        South Brooklyn studios · $3,200 max
      </p>

      <Suspense fallback={<div className="text-muted-foreground">Loading stats...</div>}>
        <StatsBar />
      </Suspense>

      <Suspense fallback={null}>
        <FilterTabs />
      </Suspense>

      <Suspense fallback={<div className="text-muted-foreground">Loading listings...</div>}>
        <ListingsTable />
      </Suspense>
    </main>
  );
}
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

Expected: Build succeeds (may warn about missing DATABASE_URL — that's OK for now).

- [ ] **Step 4: Commit**

```bash
git add src/components/listings-table.tsx src/app/page.tsx
git commit -m "feat: add listings table and dashboard page"
```

---

## Chunk 5: Deploy + Wire Up

### Task 12: GitHub repo + Vercel deploy + Neon DB

- [ ] **Step 1: Create GitHub repo**

```bash
cd /Users/andrew/Projects/listings-project
gh repo create bobbyteenager89/listings-project --public --source=. --push
```

- [ ] **Step 2: Create Vercel project**

```bash
npx vercel link
```

Select: Create new project, link to `bobbyteenager89/listings-project`.

- [ ] **Step 3: Set up Neon via Vercel dashboard**

Go to Vercel project → Storage → Create New Database → select Neon.

Then pull env vars:

```bash
npx vercel env pull .env.local
```

- [ ] **Step 4: Run migrations**

```bash
npx drizzle-kit migrate
```

Expected: Listings table created in Neon.

- [ ] **Step 5: Set APIFY_TOKEN and CRON_SECRET in Vercel**

```bash
npx vercel env add APIFY_TOKEN
npx vercel env add CRON_SECRET
```

Generate CRON_SECRET with: `openssl rand -hex 32`

- [ ] **Step 6: Deploy**

```bash
npx vercel --prod
```

- [ ] **Step 7: Test cron manually**

```bash
curl -X POST https://listings-project.vercel.app/api/cron/scrape \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Expected: JSON response with `total`, `new`, `updated` counts.

- [ ] **Step 8: Verify dashboard**

Open the Vercel URL. Should show listings table (populated if cron test worked).

- [ ] **Step 9: Commit any final tweaks**

```bash
git add -A
git commit -m "chore: deployment config and final adjustments"
git push
```

---

### Task 13: Add .gitignore and project registry

- [ ] **Step 1: Ensure .gitignore is correct**

Verify `.gitignore` includes:
```
node_modules
.next
.env.local
.vercel
.superpowers
```

- [ ] **Step 2: Update ~/Projects/.projects.json**

Add the listings-project entry with status "active".

- [ ] **Step 3: Final commit and push**

```bash
git add -A
git commit -m "chore: gitignore and project registry"
git push
```
