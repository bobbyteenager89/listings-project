# Listings Project

## Overview
Personal apartment listing tracker for Brooklyn rentals. Browser-based scraping via bookmarklet on StreetEasy, scores listings, dashboard for triage.

## Tech Stack
Next.js 15 · React 19 · TypeScript · Tailwind 4 · shadcn/ui · Drizzle ORM · Neon · Vercel Cron

## URLs
- **Live:** https://listings-project.vercel.app
- **GitHub:** https://github.com/bobbyteenager89/listings-project
- **Neon DB:** neon-sky-anchor (via Vercel Storage)

## Commands
- `npm run dev` — local dev server
- `npm run build` — production build
- `npx drizzle-kit generate` — generate migrations
- `npx drizzle-kit migrate` — run migrations
- `npx drizzle-kit studio` — Drizzle Studio (DB browser)

## Structure
- `src/lib/db/schema.ts` — Drizzle schema (listings table)
- `src/lib/scoring.ts` — Listing score calculator
- `src/lib/sources/types.ts` — NormalizedListing type
- `src/app/api/scrape/ingest/` — POST endpoint for browser-scraped data (CORS-enabled)
- `src/app/api/cron/scrape/` — Daily cron: ages "new" → "active" after 24h
- `src/app/api/listings/` — GET listings + PATCH status/notes
- `src/app/page.tsx` — Dashboard (stats, filters, sortable table)
- `src/app/scrape/page.tsx` — Scrape control page with bookmarklet + neighborhood links

## Scraping Workflow
StreetEasy has PerimeterX bot protection — server-side requests get blocked.
Instead, use browser bookmarklet approach:
1. Visit `/scrape`, drag bookmarklet to bookmark bar
2. Open StreetEasy search pages (links provided), click bookmarklet on each
3. Bookmarklet extracts listing data and copies JSON to clipboard
4. Back on `/scrape`, paste CRON_SECRET and click "Paste & Ingest"
5. Data POSTs to `/api/scrape/ingest` which upserts, scores, and tracks price changes

## Environment Variables
- `DATABASE_URL` — Neon connection string (from Vercel integration)
- `CRON_SECRET` — Vercel Cron auth secret (also used for ingest API auth)
