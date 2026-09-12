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

## Put it online (no terminal required)

Want a real `https://` link you can open on your phone or laptop? Two steps:
get a free database, then deploy.

### 1. Get a free Postgres database (~1 minute)

1. Go to **[neon.tech](https://neon.tech)** and sign up (free).
2. Create a project — it creates a database instantly.
3. On the project dashboard, copy the **connection string** shown (starts with
   `postgresql://...`). You'll paste this in step 2 below — for both the
   "DATABASE_URL" and "DIRECT_DATABASE_URL" fields (it's fine to use the same
   value for both to start).

### 2. Deploy to Vercel (~2 minutes)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FGagepinders%2FLuxe%2Ftree%2Fclaude%2Fluxe-landscape-crm-s2fgwu&env=DATABASE_URL,DIRECT_DATABASE_URL,SEED_SECRET&envDescription=Paste%20your%20Neon%20Postgres%20connection%20string%20for%20the%20first%20two.%20For%20SEED_SECRET%2C%20make%20up%20any%20password%20%E2%80%94%20you%27ll%20use%20it%20once%20to%20load%20demo%20data.&project-name=luxe-crm&repository-name=luxe-crm)

1. Click the button above. Sign up for Vercel (free) if you don't have an
   account, and let it connect to your GitHub.
2. When it asks for environment variables, fill in:
   - `DATABASE_URL` — the connection string from Neon.
   - `DIRECT_DATABASE_URL` — the same connection string again.
   - `SEED_SECRET` — make up any password (you'll use it once, next).
3. Click **Deploy**. It takes a minute or two to build.
4. Once it says "Ready", click **Visit** to open your CRM's real web address.
5. To load the sample customers/properties/quotes/jobs, visit
   `https://<your-app>.vercel.app/api/seed?key=<the SEED_SECRET you chose>`
   once in your browser. You'll see a confirmation message — then go back to
   the dashboard.

That's it — bookmark the `https://<your-app>.vercel.app` link and open it
from any browser or phone. Visiting `/api/seed?key=...` again at any point
wipes and reloads the demo data, so use it to reset back to a clean demo.

## Stack

- Next.js 16 (App Router, Server Actions) + TypeScript + Tailwind CSS
- Prisma 7 + PostgreSQL (via the `pg` driver adapter)
- Leaflet / react-leaflet + Turf.js for the property-measuring and routing maps
  (OpenStreetMap tiles — no API key required)

## Running it locally instead

Requires Node.js and a Postgres database (a local one, or the same Neon one
from above).

```bash
npm install                       # also runs `prisma generate`
# set DATABASE_URL (and optionally DIRECT_DATABASE_URL) in .env
npm run db:migrate                # applies migrations
npm run db:seed                   # loads demo data
npm run dev                       # http://localhost:3000
```

To reset the database back to the seeded demo state at any point:

```bash
npm run db:reset
```

### Production build

```bash
npm run build   # also runs `prisma migrate deploy`
npm run start
```

## Notes

- The service catalog (mowing, spring/fall cleanup, mulch, hedge trimming, weed
  control, snow plowing, ice management, etc.) and the company profile default to
  Luxe Landscape & Snow's real services — edit `lib/seedDatabase.ts` or the
  `ServiceType` table to adjust pricing/services.
- Map tiles are fetched live from `tile.openstreetmap.org` over HTTPS, so an
  internet connection is required for the map views (property measurement,
  property detail, and route planning) to render tile imagery.
- The `/api/seed` endpoint only works when `SEED_SECRET` is set and the key
  matches — leave `SEED_SECRET` unset in your environment to disable it entirely.
