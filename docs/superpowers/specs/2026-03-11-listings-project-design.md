# Listings Project — Design Spec

**Date:** 2026-03-11
**Status:** Approved

## Overview

A personal apartment listing tracker that scrapes StreetEasy every 4 hours, scores listings, and presents them in a sortable dashboard for daily triage. Built to expand to other listing sources (Zillow, Apartments.com) in the future.

## Search Criteria

- **Move date:** May 2026
- **Type:** Studios (0BR)
- **Budget:** ≤ $3,200/mo
- **Neighborhoods:** Carroll Gardens, Cobble Hill, Brooklyn Heights, Boerum Hill, Prospect Heights, Park Slope, Fort Greene, Gowanus, Red Hook
- **Strong preference:** In-unit laundry, no-fee, elevator

## Stack

- Next.js 15 + React 19 + TypeScript
- Tailwind 4 + shadcn/ui
- Drizzle ORM
- Neon (via Vercel integration, free tier)
- Apify (`jupri/streeteasy-scraper` actor)
- Vercel Cron (every 4 hours)

## Architecture

```
Vercel Cron (4hr) → /api/cron/scrape → Apify Actor → Neon DB
                                                         ↓
                                              Dashboard (table UI)
```

## Database Schema

One table: `listings`

| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| source | text | `'streeteasy'` — future: `'zillow'`, etc. |
| source_id | text | Listing ID from source |
| url | text unique | Full listing URL |
| address | text | |
| unit | text | |
| neighborhood | text | |
| price | int | Monthly rent |
| net_effective | int | After concessions |
| sqft | int | |
| no_fee | boolean | |
| new_dev | boolean | |
| has_laundry | boolean | |
| has_elevator | boolean | |
| photo_count | int | |
| score | real | Computed on ingest |
| status | enum | `new`, `active`, `favorite`, `dismissed`, `off_market` |
| first_seen | timestamp | |
| last_checked | timestamp | |
| notes | text | Personal notes |

## Scoring Algorithm

- Price ≤ $2,500: +4 / ≤ $2,800: +3 / ≤ $3,000: +2 / ≤ $3,200: +1
- Sqft ≥ 600: +2 / ≥ 450: +1
- No fee: +2
- In-unit laundry: +3
- Elevator: +1
- New dev: +1
- Preferred neighborhood: +1
- No photos: -3

## API Routes

- `GET /api/listings` — paginated (20/page default), filterable (status, neighborhood, price range — filters are additive on top of tab selection), sortable (score desc + first_seen desc by default, also: price, date, sqft)
- `PATCH /api/listings/[id]` — update status (favorite/dismiss), add notes
- `POST /api/cron/scrape` — cron endpoint, protected by `CRON_SECRET`

## Scraping Layer

### Apify Integration

- Actor: `jupri/streeteasy-scraper`
- Input: StreetEasy search URL with filters (studios, ≤$3,200, target neighborhoods)
- Output: Structured JSON (address, price, sqft, amenities, photos, URL)
- Cost: ~$0.25-0.50 per run, ~$1.50-3/day

### Source Abstraction

```typescript
interface ListingSource {
  name: string
  fetchListings(): Promise<NormalizedListing[]>
}
```

One file per source: `sources/streeteasy.ts`. Adding a new source = one new file implementing the interface.

### Cron Behavior

- Loops through active sources, fetches listings
- New listings inserted with `status: 'new'`
- Listings in `status: 'new'` for >24 hours automatically move to `active`
- Existing listings: update price, last_checked. Recalculate score from scratch on any data change.
- Price drops: recalculate score, add note "Price dropped from $X to $Y". User status (favorite/dismissed) is preserved — dismissed listings stay dismissed even if price drops.
- Listings absent from 3 consecutive scrapes: mark `off_market`. If same source_id reappears later, reactivate to `new`.
- Score uses `net_effective` when available, falls back to `price`.
- On Apify failure: log error, return 500, let Vercel Cron retry. Wrap upserts in a transaction.

## Dashboard UI

### Layout: Sortable Table

Columns: Address (link to source) | Neighborhood | Price / Net Effective | Sqft | Tags (pills) | Score | Actions

### Filter Tabs

All | New (unseen) | Favorites | Dismissed

### Sort Options

Score (default desc) | Price | Date Added | Neighborhood | Sqft

### Row Interactions

- Click row → expand inline with full details + notes field
- Star → favorite
- X → dismiss (fades, moves to Dismissed tab)
- Link icon → opens listing on source site

### Stats Bar

Total active | New today | Favorites count | Last scraped timestamp

## Not Building (YAGNI)

- Authentication (personal tool)
- Push/SMS/WhatsApp notifications
- Price history charts
- Neighborhood analytics
- Map view
- Multi-user support

## Prior Art

The OpenClaw "Scout" agent at `~/.openclaw/agents/apartments/` on the Mac Mini has a working schema and scoring algorithm in `search.js`. The scraping approach (direct GraphQL via `streeteasy-api` npm package) is blocked by PerimeterX 403s. This project replaces that approach with Apify while reusing the scoring logic and search criteria.
