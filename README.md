# HRM ARGOS — уланиш мониторинги (dashboard)

Real-time leadership dashboard for the Uzbekistan Ministry of Health showing how the
3,886 legally-registered medical organizations are connecting to the **HRM ARGOS**
system (hrm.argos.uz), by region, with an actionable list of who is not yet connected.

Built with **Next.js 16 (App Router) + TypeScript + Tailwind v4 + Apache ECharts**.
UI is Uzbek Cyrillic. Data labels come from the ARGOS report as-is.

## Screens

- **/** — Overview: readiness ring, KPI cards, a stacked national split, an
  **Uzbekistan choropleth map** (linked to a region ranking), and the 3 lowest regions.
- **/hududlar/[region]** — Per-region breakdown + full organization list.
- **/ulanmaganlar** — All not-connected organizations, filterable/searchable, enriched
  with rahbar / phone / address from the registry, with **Excel export**.
- **/trend** — Connection rate over time (accumulates as new reports are uploaded).
- **/admin** — Password-protected upload for a new ARGOS report (and, optionally, the registry).

## Data

Two ARGOS `.xlsx` files feed the dashboard:

| File | Used for | Frequency |
|------|----------|-----------|
| `HRM_ARGOS_hisobot_*.xlsx` | connection status per organization (`Маълумотлар` + `Ҳисобот` sheets) | every update |
| `1700 РЕЕСТР_*.xlsx` | contact enrichment (rahbar / phone / address) joined by **STIR** | rarely |

Parsed, normalized snapshots live as JSON:

- `data/seed-snapshot.json` — committed seed (02.07.2026 report). Shown until an upload exists.
- `data/registry.json` — committed contact registry.
- `public/uzbekistan.geo.json` — region map (geoBoundaries, CC BY 4.0), region names in Cyrillic.

The browser-side parser (`lib/parse.ts`, SheetJS) mirrors the Python seed generator
(`scripts/gen_seed.py`) so an admin upload produces the exact same shape.

## Two ways data updates

1. **Admin upload (self-service, real-time).** Open `/admin`, drop in the new
   `HRM_ARGOS_hisobot_*.xlsx` (and the registry if it changed), enter the admin password,
   and publish. The dashboard updates immediately for everyone. Each upload is stored and
   adds a point to the trend. Requires **Vercel Blob** in production (see below).
2. **Dev / Claude rebuild.** Regenerate `data/seed-snapshot.json` from a new file with
   `python scripts/gen_seed.py` (adjust the file paths inside) and redeploy.

## Local development

```bash
npm install
npm run dev        # http://localhost:3000
```

`.env.local` (git-ignored) holds `ADMIN_PASSWORD`. Without a Blob token, uploads persist
locally to `./.data/` so the full loop is testable offline.

## Environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `ADMIN_PASSWORD` | yes | Gate for the `/admin` upload action. **Change it before sharing.** |
| `BLOB_READ_WRITE_TOKEN` | prod (for uploads) | Vercel Blob store — shared storage so every viewer sees the latest upload. Auto-set when a Blob store is linked to the project. |

The public dashboard needs no login; only the upload action is protected.

## Deploy to Vercel

1. **Create the project.** Either:
   - Push this folder to a GitHub repo and "Import Project" on vercel.com, or
   - From this folder: `npx vercel` (first run links/creates the project), then
     `npx vercel --prod`. (Run `npx vercel login` first — that step is interactive.)
2. **Add a Blob store** (needed for self-service uploads): Vercel dashboard →
   your project → **Storage → Create → Blob**. This sets `BLOB_READ_WRITE_TOKEN`
   automatically. The Hobby (free) tier is sufficient for this data size.
3. **Set `ADMIN_PASSWORD`** in Project → Settings → Environment Variables.
4. Redeploy. Share the production URL with leadership; give the admin password only to
   whoever uploads new ARGOS reports.

Without a Blob store the dashboard still works (from the committed seed), but the `/admin`
upload will report that storage isn’t configured.

## Notes

- Connection rate `%` follows ARGOS’s own formula: `ulangan / total` (removed organizations
  included in the denominator), so numbers match the official report.
- `Республика муассасалари` is a central (non-geographic) category — shown in the ranking
  and cards, but not on the map.
