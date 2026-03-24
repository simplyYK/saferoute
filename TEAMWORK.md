# SafeRoute — Team Completion Guide

> 3 parallel workstreams to take the app from scaffold → fully working.
> Each teammate clones the repo, creates their branch, and runs their Claude prompt.

---

## Git workflow (do this FIRST — all 3 teammates)

```bash
git clone https://github.com/simplyYK/saferoute.git
cd saferoute
npm install --legacy-peer-deps
cp .env.example .env.local      # fill in your keys (see each stream below)
git checkout -b stream-1-infra  # or stream-2-ai, stream-3-polish
npm run dev                     # http://localhost:3000
```

When done:
```bash
git add .
git commit -m "stream 1: supabase + map working"
git push origin stream-1-infra
# open a PR on GitHub → one person merges in order: 1 → 2 → 3
```

**Merge order matters: Stream 1 first (Supabase schema), then 2, then 3.**

---

## Stream 1 — Infrastructure, Map & Reports
**Owner:** Teammate 1
**Branch:** `stream-1-infra`
**Time:** ~90 min

### Manual steps before running the prompt

1. Go to [supabase.com](https://supabase.com) → New project (free tier, pick nearest region)
2. In Supabase SQL Editor, run **`supabase/migrations/001_initial_schema.sql`** (paste and run)
3. Then run **`supabase/seed.sql`** to load Kharkiv sample data
4. Go to Project Settings → API → copy **Project URL** and **anon public key**
5. Add to `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
   ```
6. Restart dev server: `npm run dev`

### Claude prompt (paste this into Claude Code)

```
I'm working on a Next.js 14 crisis navigation app called SafeRoute. 
I have Supabase credentials in .env.local and the database schema is already set up.
Please do the following in order:

1. VERIFY the Supabase connection works: in lib/supabase/client.ts, confirm isSupabaseConfigured 
   correctly detects the env vars, and test by checking the reports table returns data.

2. FIX the Leaflet map so it renders properly at full height. The map is at 
   components/map/CrisisMap.tsx and the page is app/map/page.tsx. 
   The MapContainer currently uses height: calc(100vh - 7rem). Make sure the map 
   tiles load (OpenStreetMap), the user location blue dot appears on GPS permission, 
   and the layer toggles (conflict events, reports) work. Fix any CSS/layout issues.

3. MAKE the report form fully functional end-to-end:
   - app/report/page.tsx and components/report/ReportForm.tsx
   - On submit it should insert into Supabase reports table
   - On success the new report should appear on the map within 2 seconds (realtime)
   - Show a proper success toast/message
   - Add a "Supabase not configured" warning banner if env vars are missing

4. FIX the ReportForm 3-step flow: step 1 = category grid, step 2 = severity/title/desc, 
   step 3 = location (auto-detect GPS or manual lat/lng entry) + submit button.
   Make it visually polished with progress indicator.

5. Add a small status banner to the map page showing:
   - "X active reports in your area" (from Supabase)
   - A pulsing green dot when realtime is connected

Test everything works with npm run dev, fix any TypeScript errors, and commit.
```

---

## Stream 2 — AI Chat, News Feed & API Integrations
**Owner:** Teammate 2
**Branch:** `stream-2-ai`
**Time:** ~90 min

### Manual steps before running the prompt

**For AI (pick ONE):**

Option A — OpenAI:
```
OPENAI_API_KEY=sk-...
```
Get key: [platform.openai.com](https://platform.openai.com) → API keys

Option B — Groq (free, fast):
```
GROQ_API_KEY=gsk_...
```
Get key: [console.groq.com](https://console.groq.com) → free account

Option C — Google Gemini (free tier):
```
GEMINI_API_KEY=AIza...
```
Get key: [aistudio.google.com](https://aistudio.google.com)

Add whichever key to `.env.local`.

**For ACLED conflict data (free):**
1. Register at [developer.acleddata.com](https://developer.acleddata.com)
2. Add to `.env.local`: `ACLED_API_KEY=your-key` and `ACLED_EMAIL=your@email.com`

### Claude prompt (paste this into Claude Code)

```
I'm working on a Next.js 14 crisis navigation app called SafeRoute.
I have API keys in .env.local. Please do the following:

1. UPDATE the AI chat to work with my available API key. Check .env.local to see which 
   key is present (OPENAI_API_KEY, GROQ_API_KEY, or GEMINI_API_KEY) and update 
   app/api/groq/route.ts accordingly:
   - If OPENAI_API_KEY: use openai npm package with gpt-4o-mini, streaming SSE
   - If GROQ_API_KEY: keep existing groq setup but fix any issues
   - If GEMINI_API_KEY: use @google/generative-ai package with gemini-1.5-flash, streaming
   The system prompt should be crisis-specific: first aid, evacuation guidance, 
   shelter finding, staying calm under pressure. Support the 6 languages already in the app.
   Make sure components/chat/ChatInterface.tsx streams responses properly with 
   typing indicator and markdown rendering.

2. FIX the news feed at app/news/page.tsx and app/api/gdelt/route.ts:
   - GDELT may be unreliable — add a fallback to these free RSS feeds parsed server-side:
     * Reuters World: https://feeds.reuters.com/reuters/worldNews
     * BBC World: http://feeds.bbci.co.uk/news/world/rss.xml
     * Al Jazeera: https://www.aljazeera.com/xml/rss/all.xml
   - Parse XML to JSON server-side, extract title/description/link/pubDate
   - Classify articles as critical/warning/advisory based on keywords 
     (war, attack, explosion, killed = critical; military, conflict, crisis = warning)
   - Show last 20 articles with severity color coding
   - Add auto-refresh every 5 minutes

3. FIX the conflict data overlay at app/api/acled/route.ts:
   - If ACLED_API_KEY is set, fetch real data for the selected country
   - If not set, return realistic mock GeoJSON data for Ukraine/Gaza/Sudan so the 
     map always shows something (not empty)
   - Each event should show: event type, date, fatalities, location in popup

4. Make the AI assistant quick-action buttons relevant:
   - "Find nearest shelter", "Evacuation routes", "First aid for injuries",
     "Is it safe to move now?", "Emergency contacts", "Water/food nearby"
   - Each should pre-fill the chat with a useful prompt

5. Add a language selector that actually changes the UI language using the 
   existing translation files in public/locales/. The useLanguage hook is already 
   built — make sure it's wired up to all major UI text.

Fix any TypeScript errors, test with npm run dev, commit when working.
```

---

## Stream 3 — Routes, Resources & UI Polish
**Owner:** Teammate 3
**Branch:** `stream-3-polish`
**Time:** ~90 min

### Manual steps before running the prompt

No extra API keys needed for this stream — OSRM and Overpass are free public APIs.

Optional for better health facility data:
```
HEALTHSITES_API_KEY=your-key
```
Get key: [healthsites.io](https://healthsites.io/api/docs/) → free registration

### Claude prompt (paste this into Claude Code)

```
I'm working on a Next.js 14 crisis navigation app called SafeRoute.
All API keys for this stream use free public APIs. Please do the following:

1. FIX the route planner end-to-end (app/route/page.tsx + components/route/RoutePlanner.tsx 
   + app/api/osrm/route.ts):
   - Add two search inputs: "From" (default: your GPS location) and "To" (type a place name)
   - Geocode place names using Nominatim: https://nominatim.openstreetmap.org/search?q=...&format=json
   - Fetch up to 3 routes from OSRM public API (router.project-osrm.org)
   - Display routes on the map as colored polylines (green=safest, yellow=moderate, red=risky)
   - Show route cards with: distance, estimated time, safety score (0-100), step count
   - Safety score uses lib/utils/safety-score.ts — make it work even with no Supabase data
   - Show turn-by-turn directions when a route card is clicked
   - Add "pedestrian / car / bicycle" mode toggle

2. FIX the resources page (app/resources/page.tsx + app/api/overpass/route.ts):
   - Use browser GPS to get location, then query Overpass API for nearby:
     hospitals, shelters, pharmacies, water points, police stations
   - Show results as a list sorted by distance with: name, type icon, distance, 
     opening hours if available, "Navigate" button (opens Google Maps directions)
   - Add filter chips at top: All / Medical / Shelter / Water / Safety
   - Show a mini-map with pins (reuse CrisisMap or simple Leaflet instance)
   - Handle the case where GPS is denied: show a manual location search input

3. ADD PWA icons so the app is installable:
   - Create a simple shield icon as SVG, export as PNG at 192x192 and 512x512
   - Save to public/icons/icon-192.png and public/icons/icon-512.png
   - The manifest.json already references these paths

4. IMPROVE the landing page (app/page.tsx):
   - Add a live counter that animates up to show "Active reports: loading..." 
     and fetches real count from Supabase if configured (else shows demo number)
   - Add a "How it works" section: 3 steps with icons
   - Make the region buttons actually pass the region to the map correctly
   - Add a footer with: "Built at IE University Hackathon · Open source"

5. GENERAL polish pass:
   - Add loading skeletons to all pages (not just spinners)
   - Make sure BottomNav highlights the active tab correctly on all pages
   - Add an offline banner: "You are offline — some features unavailable"
     (detect with window.addEventListener('online'/'offline'))
   - Fix any mobile layout issues (test at 375px width viewport mentally)
   - Make the SOS button pulse red and always visible

Fix TypeScript errors, run npm run dev to verify, commit when working.
```

---

## Final merge & deploy (Lead developer)

After all 3 PRs are merged:

```bash
git checkout main
git pull origin main
npm install --legacy-peer-deps
npm run build   # must pass with 0 errors
```

### Deploy to Vercel (free, 2 minutes)
1. Go to [vercel.com](https://vercel.com) → Import Git Repository → select `simplyYK/saferoute`
2. Add all env vars from `.env.local` in Vercel project settings
3. Deploy → get a public URL to share with judges

### Vercel env vars to add:
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
GROQ_API_KEY (or OPENAI_API_KEY or GEMINI_API_KEY)
ACLED_API_KEY
ACLED_EMAIL
HEALTHSITES_API_KEY (optional)
```

---

## What each stream delivers

| Stream | Owner | Delivers |
|--------|-------|---------|
| 1 — Infra & Map | TM1 | Working map with tiles ✓, Supabase reports ✓, realtime updates ✓ |
| 2 — AI & News | TM2 | Working AI chat ✓, live news feed ✓, conflict overlay ✓ |
| 3 — Routes & Polish | TM3 | Working route planner ✓, resources list ✓, PWA icons ✓, polish ✓ |

