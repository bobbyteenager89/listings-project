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
