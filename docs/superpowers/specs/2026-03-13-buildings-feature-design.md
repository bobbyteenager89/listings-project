# Buildings Feature Design

**Date:** 2026-03-13
**Status:** Approved

## Overview

Add a buildings view to the listings dashboard. Users can discover and track Brooklyn buildings with available studios, starting with buildings built 2024-2026. Two-layer scraping: search page for building discovery, individual building pages for unit details.

## Data Model

### `buildings` table

| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| name | text | Building name |
| address | text | Street address |
| neighborhood | text | Lowercase, matches listings convention |
| slug | text | SE URL slug (unique index) |
| url | text | Full StreetEasy building URL |
| yearBuilt | integer | Year constructed |
| totalUnits | integer | Total units in building |
| studioCount | integer | Currently available studios (updated on unit ingest) |
| amenities | jsonb | `{doorman, gym, roof, laundry, pool, parking, elevator, bikeRoom, storage, concierge}` |
| imageUrl | text | Building photo |
| status | text | `active` / `dismissed` (default: `active`) |
| firstSeen | timestamp | When first scraped |
| lastChecked | timestamp | Last unit scrape |

### `building_units` table

| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| buildingId | integer FK | References buildings.id |
| unit | text | Unit number/letter |
| price | integer | Monthly rent |
| sqft | integer | Square footage |
| beds | integer | Bedroom count (0 = studio) |
| noFee | boolean | No broker fee |
| url | text | Unit listing URL |
| available | boolean | Currently available (default: true) |
| firstSeen | timestamp | |
| lastSeen | timestamp | |

Unique index on `(buildingId, unit)`.

## Scraping Workflow

### Bookmarklet 1: "SE Buildings" (search results page)

Runs on StreetEasy building search results. Extracts from each building card:
- name, address, neighborhood, year built, slug, total units, image URL

Output: JSON array copied to clipboard.

### Bookmarklet 2: "SE Units" (individual building page)

Runs on a single StreetEasy building page. Extracts:
- Building amenities from the amenities section
- Available rental units: unit #, price, sqft, beds, no-fee flag, URL
- Building slug from the URL

Output: JSON object with `{slug, amenities, units[]}` copied to clipboard.

### Ingest Endpoints

**`POST /api/buildings/ingest`**
- Auth: Bearer CRON_SECRET
- Body: `{buildings: [...]}`
- Upserts by slug
- CORS enabled (same as listings ingest)

**`POST /api/buildings/units/ingest`**
- Auth: Bearer CRON_SECRET
- Body: `{slug: "...", amenities: {...}, units: [...]}`
- Looks up building by slug
- Upserts units by (buildingId, unit)
- Marks units not in batch as `available: false`
- Updates building's `studioCount` (count of available units where beds=0)
- Updates building's `amenities` and `lastChecked`

## Dashboard Integration

### Filter Tabs

Add `{ label: "Buildings", value: "buildings" }` to STATUS_TABS in `filter-tabs.tsx`.

When `status=buildings` is selected:
- Hide the listings table
- Show building cards instead
- Fetch from `GET /api/buildings` (separate endpoint)

### Buildings API

**`GET /api/buildings`**
- Returns buildings with `status != 'dismissed'`, ordered by yearBuilt DESC, studioCount DESC
- Includes nested `units` array (available units where beds=0, ordered by price ASC)
- Supports `?neighborhood=` filter

### Building Cards UI

Each building renders as a card showing:
- Building name (large), address + neighborhood, year built
- Amenity badges (pill-shaped, color-coded)
- "N studios available" count
- Expandable unit list: unit #, sqft, price, link to SE

### Scrape Page Updates

- Add "SE Buildings" and "SE Units" bookmarklets (drag to bookmark bar)
- Add building search links for Brooklyn neighborhoods, filtered to year built 2024+
- Add "Paste & Ingest Buildings" and "Paste & Ingest Units" buttons
- Auto-detect format: if clipboard JSON has `buildings` key → building ingest; if it has `slug` + `units` → unit ingest

## Scope

- Brooklyn only (same neighborhoods as existing SE_BROOKLYN list)
- Studios only in the unit display (beds=0), though we store all unit types
- Start with 2024-2026 built year, can expand later
- No scoring for buildings (unlike listings)
