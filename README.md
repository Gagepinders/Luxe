# Luxe Landscape & Snow — CRM

An all-in-one CRM built for **Luxe Landscape & Snow** (Chittenden County, VT —
Burlington, Essex Junction, Williston and surrounding towns), covering:

- **Customers** — contact info, tags, notes/activity timeline, linked properties/quotes/jobs.
- **Properties** — address + an interactive map (OpenStreetMap/Leaflet) to drop a
  property pin and trace lawn/driveway/walkway boundaries, auto-calculating square
  footage and acreage.
- **Quotes** — line-item estimates with a draft → sent → won/lost pipeline, win-rate
  and pipeline-value KPIs, and one-click conversion of a won quote into a scheduled job.
- **Jobs** — list and calendar scheduling views, status tracking (scheduled → in
  progress → completed/cancelled), crew assignment, and recurrence (weekly mowing,
  on-demand snow removal, etc.) with a "schedule next occurrence" shortcut.
- **Routes** — a day-by-day map of that day's jobs with a nearest-neighbor route
  optimizer and manual stop reordering, saved back to each job.
- **Dashboard** — won revenue this month, win rate, jobs completed, overdue quotes,
  estimated recurring monthly revenue, upcoming jobs, and quote pipeline breakdown.

## Stack

- Next.js 16 (App Router, Server Actions) + TypeScript + Tailwind CSS
- Prisma 7 + SQLite (via the `better-sqlite3` driver adapter)
- Leaflet / react-leaflet + Turf.js for the property-measuring and routing maps
  (OpenStreetMap tiles — no API key required)

## Getting started

```bash
npm install          # also runs `prisma generate`
npm run db:migrate    # creates prisma/dev.db and applies migrations
npm run db:seed       # loads realistic demo data for Luxe Landscape & Snow
npm run dev            # http://localhost:3000
```

To reset the database back to the seeded demo state at any point:

```bash
npm run db:reset
```

### Production build

```bash
npm run build
npm run start
```

## Notes

- The service catalog (mowing, spring/fall cleanup, mulch, hedge trimming, weed
  control, snow plowing, ice management, etc.) and the company profile default to
  Luxe Landscape & Snow's real services — edit `prisma/seed.ts` or the `ServiceType`
  table to adjust pricing/services.
- Map tiles are fetched live from `tile.openstreetmap.org` over HTTPS, so an internet
  connection is required for the map views (property measurement, property detail,
  and route planning) to render tile imagery — everything else works offline against
  the local SQLite database.
