# Lahore Waste Intelligence System (LWIS)

A city-operations-grade waste intelligence platform for Lahore, built for the
Smart City Hackathon. Not a garbage-reporting form — a mapping, scoring, and
prioritization layer that turns citizen photo reports into an auditable
cleanup priority queue.

**Demo flow:** Lahore Map → Area → Hotspot → Photo report → AI waste analysis
→ Recovery/risk breakdown → Priority score → Recommended action → City
intelligence updates live.

## What's real vs. demo

- **Map & geodata**: real OpenStreetMap tiles + Nominatim reverse geocoding
  (no API key needed). Swappable for Google Maps by changing `MapView.jsx`.
- **Hotspot dataset**: seeded, clearly-labeled **community/demo data** for
  ~12 real Lahore neighborhoods (Shahdara, Baghbanpura, Gulberg, Kot Lakhpat,
  etc). This is not live municipal data — the UI says so everywhere it
  matters.
- **AI waste vision**: `/api/analyze` calls Anthropic's vision-capable API
  when `ANTHROPIC_API_KEY` is set as a Vercel environment variable, and
  returns structured JSON (categories, severity, recoverable %, hazard
  indicators, confidence). **Without a key**, the app automatically falls
  back to an in-browser color/composition heuristic
  (`src/lib/heuristicAI.js`) that runs on the real uploaded photo — it's
  clearly labeled "Demo AI model" in the UI so it's never confused with the
  live model.
- **Priority Score Engine**: fully deterministic and auditable
  (`src/lib/priorityEngine.js`) — severity + recurrence + proximity to
  sensitive facilities + waste-type risk + hazard/burning + accumulation
  trend, weighted to 0–10.
- **Persistence**: browser `localStorage` for the demo (seed data +
  submitted reports). `src/lib/store.js` is the single place to swap in
  Supabase — see `supabase/schema.sql` for a ready-to-run schema matching
  the same data shape.

## Run locally

```bash
npm install
npm run dev
```

## Enable the live AI vision model

Set `ANTHROPIC_API_KEY` in your Vercel project's environment variables
(Project → Settings → Environment Variables), redeploy, and `/api/analyze`
will use Claude's vision API automatically. No code changes needed.

## Wiring up Supabase (post-hackathon)

1. Create a Supabase project, run `supabase/schema.sql`.
2. Add `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` as env vars.
3. Replace the `localStorage` calls in `src/lib/store.js` with
   `@supabase/supabase-js` client calls — the function signatures
   (`loadHotspots`, `saveHotspots`, `saveReport`, `applyReportToHotspots`)
   are already the seam to do this without touching any component.

## Tech

React 18 + Vite, react-leaflet + OpenStreetMap, Vercel serverless function
for AI vision, deterministic JS scoring engine, localStorage (Supabase-ready
seam).
