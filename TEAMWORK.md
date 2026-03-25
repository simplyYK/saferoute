# SafeRoute Intelligence — Team Build Guide
### IE University Cursor AI Hackathon · March 2026

> **Revised vision:** A Palantir-style dual-mode platform.
> - **Field Mode (mobile):** Civilian survival tool — reports, routes, resources, SOS
> - **Intelligence Mode (desktop):** 3D globe with live flight tracking, seismic events,
>   satellite orbits, CCTV feeds, visual modes (FLIR / Night Vision / CRT)

---

## Git workflow — ALL teammates do this first

```bash
# 1. Clone the repo
git clone https://github.com/simplyYK/saferoute.git
cd saferoute

# 2. Install dependencies
npm install --legacy-peer-deps

# 3. Copy and fill in env vars (see your stream's section below)
cp .env.example .env.local

# 4. Create YOUR branch
git checkout -b stream-1-globe      # or stream-2-intelligence, stream-3-ai, stream-4-civilian

# 5. Start dev server
npm run dev    # http://localhost:3000

# 6. When done — push and open a PR
git add .
git commit -m "stream 1: 3D globe working"
git push origin stream-1-globe
# → open PR on GitHub → team lead merges
```

**Merge order: Stream 1 → Stream 2 → Stream 3 → Stream 4**
(Each stream depends on what the previous one adds)

---

## Stream 1 — 3D Intelligence Globe
**Branch:** `stream-1-globe`
**Owner:** Teammate 1
**Time:** ~90 min

### What this stream delivers
- Full-screen 3D interactive globe on `/globe` page (desktop)
- Google Photorealistic 3D Tiles rendering (if API key available) OR free CartoDB tiles
- Atmosphere glow, auto-rotation, smooth fly-to on region select
- Layer toggle panel (conflict events, reports, flights, seismic, satellites)
- `/map` still exists for mobile (Leaflet, unchanged)
- Landing page updated: detects screen size → routes to `/globe` (desktop) or `/map` (mobile)

### Keys to add to `.env.local`

```
# Google Maps API key — optional but makes it photorealistic
# Console: https://console.cloud.google.com → APIs & Services → Enable "Map Tiles API"
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIza...your-key
```
If you don't have a Google key, globe.gl will use free CartoDB Dark Matter tiles — still looks great.

### Claude prompt (open Claude Code in the repo and paste this)

```
I'm building a Next.js 14 app called SafeRoute Intelligence — a Palantir-style
geospatial dashboard for crisis navigation. The repo already has a working Leaflet
map at /map and all the existing pages. I need you to add a 3D intelligence globe.

STEP 1 — Install globe.gl:
  npm install globe.gl --legacy-peer-deps
  npm install --save-dev @types/three --legacy-peer-deps

STEP 2 — Create app/globe/page.tsx as a full-screen intelligence dashboard page.
The page layout:
  - Full screen dark background (#0a0f1e — deep space navy)
  - TopBar at top (reuse existing component)
  - The 3D globe fills the whole viewport
  - A translucent layer panel on the RIGHT side (like Palantir)
  - A visual mode selector at top-left (Standard / FLIR / Night Vision / CRT)
  - BottomNav at bottom (reuse existing)

STEP 3 — Create components/globe/IntelligenceGlobe.tsx:
  Use globe.gl with dynamic import (ssr: false). Configuration:
  - Globe background: deep space (#0a0f1e)
  - If NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is set, use Google Photorealistic 3D Tiles:
    globeImageUrl: `https://tile.googleapis.com/v1/2dtiles/{z}/{x}/{y}?session=...&key=${key}`
    (Use the Maps Tiles REST API session token approach)
  - If no Google key, use: globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
    and bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
  - atmosphereColor: "#0EA5E9" (teal)
  - atmosphereAltitude: 0.15
  - Auto-rotation: globe.controls().autoRotate = true; autoRotateSpeed = 0.3
  - Stop rotation on user interaction, resume after 3s idle
  - Initial position: lat 48, lng 31 (centered on Eastern Europe/Middle East)
  - Zoom to show full globe on load

STEP 4 — Add layer data to the globe:
  Create placeholder data layers (real data comes in Stream 2):
  
  a) CONFLICT POINTS layer (hexbin/heatmap):
     - Fetch from /api/acled?country=Ukraine (existing endpoint)
     - Render as glowing red dots: globe.pointsData(events)
       .pointLat('latitude').pointLng('longitude')
       .pointColor(() => '#DC2626').pointAltitude(0.01).pointRadius(0.3)
  
  b) REPORTS layer:
     - Fetch from Supabase reports (use existing useReports hook output)
     - Orange/yellow dots for community reports
  
  c) ARC LAYER (placeholder for flights - Stream 2 will fill this):
     - globe.arcsData([]).arcColor('color').arcAltitude(0.1)
     - Export the globe instance ref so Stream 2 can add real flight arcs
  
  d) RINGS layer (placeholder for seismic - Stream 2 will fill):
     - globe.ringsData([]).ringColor('color').ringMaxRadius(3)

STEP 5 — Create components/globe/LayerPanel.tsx:
  Translucent dark panel (bg-black/40 backdrop-blur) on the right side, 280px wide.
  Toggle switches for each layer:
  - ⚔️  Conflict Events (ACLED)
  - 📍  Community Reports
  - ✈️  Live Flights (OpenSky)
  - 🛩️  Military Aircraft (ADSB)
  - 🌍  Seismic Activity
  - 🛰️  Satellites Overhead
  - 📷  CCTV Feeds
  Each toggle glows teal when active, grey when off.
  Show live count next to each layer: "247 events", "12 reports", etc.

STEP 6 — Create components/globe/VisualModeSelector.tsx:
  4 buttons in top-left corner. Each applies a CSS filter to a div wrapping the globe:
  - Standard: no filter
  - FLIR Thermal: filter: sepia(100%) hue-rotate(300deg) saturate(500%) contrast(1.2)
    + overlay a radial gradient from orange to dark red on conflict zones
  - Night Vision: filter: saturate(0%) brightness(1.3) contrast(1.1) hue-rotate(90deg)
    + green tint overlay (rgba(0, 255, 70, 0.08))
  - CRT: add a CSS pseudo-element with repeating-linear-gradient scanlines
    + slight text-shadow: 0 0 8px rgba(0,255,70,0.5)
  Store selected mode in Zustand appStore.

STEP 7 — Update app/page.tsx landing page:
  Add JavaScript to detect screen width:
  - If window.innerWidth >= 1024: "Open Intelligence Dashboard" button → links to /globe
  - If mobile: "Open Crisis Map" button → links to /map  
  Show BOTH buttons always, just style the relevant one as primary.
  Add tagline: "Intelligence Mode for coordinators · Field Mode for civilians"

STEP 8 — Update components/navigation/BottomNav.tsx:
  Add a "Globe" tab (🌐 icon, links to /globe) as the first tab on desktop.
  On mobile it should link to /map instead.

Fix all TypeScript errors. Test that the globe renders, spins, and the layer panel opens.
The globe MUST show at http://localhost:3000/globe with no console errors.
```

---

## Stream 2 — Intelligence Data Layers
**Branch:** `stream-2-intelligence`
**Owner:** Teammate 2
**Time:** ~90 min

### What this stream delivers
- Live commercial flight tracking (OpenSky) on the globe as animated arcs
- Military/unfiltered aircraft (ADSB Exchange) on the globe
- Real-time seismic events (USGS) as expanding rings on the globe
- Live satellite orbital paths (Celestrak) as orbit lines
- Public CCTV snapshot panel
- All layers hook into the LayerPanel toggle from Stream 1

### Keys to add to `.env.local`
```
# Optional — registered OpenSky users get higher rate limits
OPENSKY_USERNAME=your-username
OPENSKY_PASSWORD=your-password
# Everything else uses free public APIs — no keys needed
```

### Claude prompt

```
I'm working on SafeRoute Intelligence, a Next.js 14 crisis navigation app with a
3D globe (globe.gl) already built at /globe. I need to add live intelligence data
layers. The globe component is at components/globe/IntelligenceGlobe.tsx and it
already has placeholder layer hooks.

STEP 1 — Create app/api/opensky/route.ts:
  Fetch from OpenSky Network REST API: https://opensky-network.org/api/states/all
  Optional auth: if OPENSKY_USERNAME + OPENSKY_PASSWORD env vars set, use Basic auth.
  Transform response into array of:
    { icao24, callsign, lat, lng, altitude, velocity, heading, onGround, category }
  Cache for 15 seconds (short TTL since this is live tracking).
  Return as JSON array. Handle API errors gracefully (return [] on failure).
  Rate limit: max 1 request per 15s per IP.

STEP 2 — Create app/api/adsb/route.ts:
  Fetch from ADSB Exchange: https://adsbexchange.com/api/aircraft/v2/lat/48.5/lon/31.5/dist/500/
  (This URL gets all aircraft within 500nm of the Ukraine/Eastern Europe center)
  Also try: https://api.adsb.fi/v1/aircraft (alternative free source)
  Transform to same format as OpenSky.
  Mark military aircraft: if icao24 starts with certain military ranges, or if
  flight callsign matches military patterns (e.g., RRR, USAF, NATO patterns).
  Label military differently: { ...aircraft, isMilitary: true }
  Cache 20 seconds.

STEP 3 — Create hooks/useFlights.ts:
  Poll /api/opensky every 20 seconds.
  Poll /api/adsb every 20 seconds.
  Merge both arrays, deduplicate by icao24.
  Return { commercial: Flight[], military: Flight[], loading, lastUpdated }

STEP 4 — Update components/globe/IntelligenceGlobe.tsx to render flights:
  Commercial flights as blue arcs (globe.gl arcsData):
    - arcStartLat/Lng: previous position (approximate from heading/velocity)
    - arcEndLat/Lng: current position
    - arcColor: () => '#3B82F6' (blue)
    - arcAltitude: 0.03
    - animate them moving: use globe.gl's built-in arc animation
  Military aircraft as bright orange points:
    - pointColor: () => '#F97316'
    - pointAltitude: 0.04
    - pointRadius: 0.5 (bigger than civilian)
  On hover: show popup with callsign, altitude, speed, origin/dest if available.

STEP 5 — Create app/api/seismic/route.ts:
  Fetch from USGS: https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson
  This returns ALL earthquakes globally in the last 24 hours.
  Transform each feature into:
    { id, lat, lng, magnitude, depth, place, time, significance }
  Filter: only include magnitude >= 2.0 (reduce noise)
  For crisis context: note that large explosions and artillery barrages register
  as 1.5-3.5 magnitude seismic events. Flag events in active conflict zones.
  Cache 5 minutes.

STEP 6 — Update components/globe/IntelligenceGlobe.tsx for seismic rings:
  Use globe.gl ringsData:
    - ringLat/Lng from each earthquake
    - ringColor: magnitude >= 5 ? '#DC2626' : magnitude >= 3 ? '#F59E0B' : '#3B82F6'
    - ringMaxRadius: magnitude * 1.5
    - ringPropagationSpeed: 2
    - ringRepeatPeriod: 700
  On click: show popup with magnitude, depth, location, time.

STEP 7 — Create app/api/satellites/route.ts:
  Fetch TLE data from Celestrak:
    - Starlink: https://celestrak.org/NORAD/elements/gp.php?GROUP=starlink&FORMAT=tle
    - Military: https://celestrak.org/NORAD/elements/gp.php?GROUP=military&FORMAT=tle
    - Weather: https://celestrak.org/NORAD/elements/gp.php?GROUP=weather&FORMAT=tle
  Parse TLE format (Two-Line Element sets) into satellite orbital params.
  Use satellite.js (npm install satellite.js) to calculate current lat/lng/altitude
  from TLE data at current timestamp.
  Return top 100 satellites (Starlink + key military ones) with:
    { id, name, lat, lng, altitude, type: 'starlink'|'military'|'weather' }
  Cache 10 minutes (orbits don't change fast).

STEP 8 — Update IntelligenceGlobe.tsx for satellite paths:
  Install: npm install satellite.js --legacy-peer-deps
  Render satellites as small white/blue dots at their actual altitude (scale appropriately).
  Draw orbital path lines (the track the satellite will take in next 90 mins).
  Color by type: Starlink=blue, Military=red, Weather=white.

STEP 9 — Create components/globe/CCTVPanel.tsx:
  Show a collapsible panel (bottom-left) with live CCTV snapshots.
  Use these free public DOT camera image URLs (refresh every 10 seconds):
    Austin TX: 
      https://cctv.austinmobility.io/image/{camera_id}.jpg
      Camera IDs: 1000, 1001, 1002, 1003, 1004 (downtown Austin cameras)
    Alternative - use any public webcam image URL that refreshes
  Show 4 thumbnail images in a 2x2 grid.
  Click to expand to full size.
  Label each: "Austin TX · Live" with a pulsing red dot.
  Note in UI: "Public infrastructure cameras — not from conflict zones (demo only)"

STEP 10 — Wire all layers to the LayerPanel toggles from Stream 1:
  Read activeLayers from mapStore (or add new layer keys to the store).
  When a layer is toggled off, clear its globe data: globe.pointsData([])
  When toggled on, refetch and re-render.
  Show live counts in LayerPanel: "✈️ Live Flights: 6,847" etc.

Ensure npm run dev works with no TypeScript errors.
All API routes must return empty arrays (not errors) when external APIs are down.
```

---

## Stream 3 — AI Intelligence + Visual Modes + News
**Branch:** `stream-3-ai`
**Owner:** Teammate 3
**Time:** ~90 min

### What this stream delivers
- AI chat upgraded to "Intelligence Analyst" persona with context from all data layers
- FLIR/Night Vision/CRT visual modes actually applied as canvas/CSS filters
- Live news feed from Reuters/BBC/Al Jazeera RSS (not GDELT which is unreliable)
- Context-aware quick actions using live layer data in AI prompts

### Keys to add to `.env.local`
```
# Pick ONE:
GROQ_API_KEY=gsk_...         # Groq (free, fast, recommended for hackathon)
OPENAI_API_KEY=sk-...        # OpenAI GPT-4o-mini
GEMINI_API_KEY=AIza...       # Google Gemini 1.5 Flash
```

### Claude prompt

```
I'm working on SafeRoute Intelligence, a Next.js 14 app. I need to upgrade
the AI assistant and news feed, and make the visual modes work.

STEP 1 — Upgrade app/api/groq/route.ts to support multiple AI providers:
  Check which API key is in env vars (GROQ_API_KEY / OPENAI_API_KEY / GEMINI_API_KEY).
  Use whichever is present. Priority: Groq > OpenAI > Gemini.
  
  For Groq: use existing groq setup with model "llama-3.1-8b-instant"
  For OpenAI: npm install openai --legacy-peer-deps
    Use "gpt-4o-mini", stream: true via SSE
  For Gemini: npm install @google/generative-ai --legacy-peer-deps
    Use "gemini-1.5-flash", stream via SSE
  
  The system prompt must be upgraded to "intelligence analyst" persona:
  ---
  You are an intelligence analyst for SafeRoute, a humanitarian crisis navigation platform.
  You have access to real-time data: conflict events from ACLED, crowdsourced civilian 
  reports, live flight tracking (OpenSky + ADSB military), seismic activity (USGS),
  and satellite positions (Celestrak).
  
  Your mission: help civilians survive and help coordinators/journalists understand 
  the situation on the ground. You provide:
  - Tactical navigation advice (when asked about routes or movement)
  - Threat assessment (interpreting flight patterns, seismic spikes near conflict)
  - Medical triage guidance (first aid, stabilization)
  - Resource location (shelters, water, hospitals in the area)
  - Evacuation planning (corridors, timing, what to bring)
  
  Always prioritize civilian safety. Never speculate beyond available data.
  Respond in the user's language. Be concise under stress.
  ---
  
  The request body can now include a `context` object:
    { country, activeReports, nearbyFlights, recentSeismic }
  Inject this as additional context before the user's message.
  
  Keep SSE streaming. Rate limit 20 req/min per IP.

STEP 2 — Upgrade components/chat/ChatInterface.tsx:
  New quick action buttons (replace old ones):
  - "🔴 Active threats near me"
  - "✈️ What aircraft are overhead?"
  - "🌍 Any seismic spikes? (could be artillery)"
  - "🏥 Nearest hospital / shelter"
  - "🚗 Safest evacuation route"
  - "📞 Emergency contacts for this region"
  Each button sends the question + current globe context (from Zustand store) to the AI.
  
  Show "Intelligence Mode" badge in chat header on desktop.
  Add a small live-data summary above the chat:
    "📍 47 active reports · ✈️ 6,847 flights tracked · 🌍 3 seismic events (24h)"

STEP 3 — Fix app/api/gdelt/route.ts to use RSS feeds instead of GDELT:
  GDELT is unreliable. Replace with proper RSS parsing:
  
  npm install rss-parser --legacy-peer-deps
  
  Fetch from these 3 sources in parallel:
    - Reuters World: https://feeds.reuters.com/reuters/worldNews
    - BBC World: http://feeds.bbci.co.uk/news/world/rss.xml
    - Al Jazeera: https://www.aljazeera.com/xml/rss/all.xml
  
  Parse each RSS feed. For each article extract:
    { title, description, link, pubDate, source, imageUrl? }
  
  Classify severity:
    CRITICAL (red): title contains "killed", "explosion", "attack", "strike", "war", 
                    "bombing", "shelling", "massacre", "invasion"
    WARNING (orange): "military", "conflict", "troops", "weapons", "missile", 
                      "ceasefire", "offensive", "casualties"
    ADVISORY (yellow): "crisis", "emergency", "displacement", "evacuation", "sanctions"
    INFO (blue): everything else
  
  Merge all 3 sources, sort by pubDate desc, return top 30 articles.
  Cache 5 minutes. Return JSON: { articles: Article[], lastUpdated: string }

STEP 4 — Fix app/news/page.tsx:
  Clean up the news page layout:
  - Header showing "Live Intelligence Feed · Updated X mins ago" with refresh button
  - Filter tabs: All | Critical | Warning | Conflict Zones (filter by crisis keywords)
  - Article cards: severity color left border, title bold, source + time, description preview
  - Click opens the article in a new tab
  - Auto-refresh every 5 minutes (useEffect with setInterval)
  - Show empty state: "No critical news · Monitoring 3 sources"

STEP 5 — Make visual modes actually work:
  The VisualModeSelector from Stream 1 stores the mode in appStore.
  Read the mode from appStore in the globe page wrapper div and apply these effects:
  
  Standard: no classes
  
  FLIR Thermal: 
    - Apply CSS to the globe wrapper: 
      filter: saturate(0%) brightness(1.5) contrast(2)
    - Add a color overlay div on top of globe:
      background: radial-gradient(circle, rgba(255,100,0,0.3), transparent 70%)
    - Make conflict point markers flash brighter
  
  Night Vision:
    - Globe wrapper: filter: saturate(0%) brightness(1.2) contrast(1.3)
    - Green tint overlay: background: rgba(0, 255, 70, 0.12)
    - Add scanline effect (subtle repeating-linear-gradient overlay)
    - All text turns green: className changes via CSS variable
  
  CRT Mode:
    - Add to globals.css:
      .crt-mode::before {
        content: '';
        position: fixed;
        inset: 0;
        background: repeating-linear-gradient(0deg, transparent, transparent 2px, 
                    rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px);
        pointer-events: none;
        z-index: 9999;
      }
    - Add slight vignette and phosphor glow

STEP 6 — Add a "Situation Report" button to the globe page:
  Button in top bar: "Generate SITREP"
  On click: sends a request to the AI with:
    "Generate a concise military-style situation report (SITREP) based on the 
     current data: [X conflict events], [Y active reports], [Z seismic events 
     in last 24h], [key flight activity]. Format: LOCATION · THREAT LEVEL · 
     RECOMMENDATION · PRIORITY ACTIONS."
  Show the response in a modal overlay styled like a real SITREP document.

Run npm run dev, fix TypeScript errors, test that AI chat works with your chosen provider.
```

---

## Stream 4 — Civilian Features, Routes & Deploy
**Branch:** `stream-4-civilian`
**Owner:** Teammate 4 (or same as Stream 1 after it's done)
**Time:** ~90 min

### What this stream delivers
- Working route planner (Nominatim geocoding + OSRM + safety color lines on map)
- Working resources page (Overpass API + distance sorting + navigate links)
- PWA icons (app installable on phone)
- Supabase reports fully working end-to-end
- Full mobile polish
- Deploy to Vercel

### Keys to add to `.env.local`
All public APIs — no extra keys needed for routes/resources.
Supabase keys from Stream 1 setup.

### Claude prompt

```
I'm working on SafeRoute Intelligence, a Next.js 14 app. I need to complete
the civilian-facing features and deploy the app.

STEP 1 — Fix the route planner completely:
  Files: app/route/page.tsx, components/route/RoutePlanner.tsx, app/api/osrm/route.ts
  
  The RoutePlanner component needs:
  a) Two inputs at top: "From" (auto-fill with GPS location name) + "To" (type a place)
  
  b) Geocoding: when user types in either input, call Nominatim:
     https://nominatim.openstreetmap.org/search?q={query}&format=json&limit=5
     Show dropdown of suggestions. On select, store lat/lng.
     Reverse geocode current GPS to get "From" location name:
     https://nominatim.openstreetmap.org/reverse?lat=X&lon=Y&format=json
  
  c) Route fetch: POST to /api/osrm with { fromLat, fromLng, toLat, toLng, mode }
     Mode selector: 🚶 Walking | 🚗 Car | 🚲 Bike
     The OSRM endpoint is already at app/api/osrm/route.ts — fix it to use:
     https://router.project-osrm.org/route/v1/{mode}/{fromLng},{fromLat};{toLng},{toLat}
     ?overview=full&geometries=geojson&alternatives=true&steps=true
  
  d) Route cards: show up to 3 routes, sorted by safety score (lib/utils/safety-score.ts).
     Each card shows: distance, time, safety score as colored bar (green/yellow/red),
     number of steps. Click to select → highlights route on the map.
  
  e) Show selected route on the Leaflet map (it's in app/route/page.tsx already —
     fix the map display to actually show the polyline in the right color).
  
  f) Turn-by-turn steps: below the selected route card, show step list:
     🔄 Turn left on Sumska St · 200m
     Use maneuver type icons: straight ↑, turn-left ←, turn-right →, roundabout ↻
  
  g) Safety score uses lib/utils/safety-score.ts which samples route coordinates
     against active reports. Make it work when there are 0 reports (return 75 default).

STEP 2 — Fix the resources page completely:
  Files: app/resources/page.tsx, app/api/overpass/route.ts
  
  a) On page load, get GPS location. If denied, show a location search input.
  
  b) Fetch from /api/overpass which queries OpenStreetMap:
     Fix app/api/overpass/route.ts to use this Overpass query:
     [out:json][timeout:15];
     (
       node["amenity"="hospital"](around:5000,{lat},{lng});
       node["amenity"="shelter"](around:5000,{lat},{lng});
       node["amenity"="pharmacy"](around:5000,{lat},{lng});
       node["amenity"="water_point"](around:5000,{lat},{lng});
       node["amenity"="police"](around:5000,{lat},{lng});
       node["amenity"="fire_station"](around:5000,{lat},{lng});
     );
     out body;
     Transform response into resources array with name, type, lat, lng, tags.
  
  c) Calculate distance from user location using haversineDistance from lib/utils/geo.ts.
     Sort by distance ascending.
  
  d) Filter chips at top: All | 🏥 Medical | 🏠 Shelter | 💊 Pharmacy | 💧 Water | 👮 Safety
  
  e) Resource card: icon, name, type, distance (e.g. "340m"), operating hours if in tags,
     phone if in tags, "Navigate" button → opens https://maps.google.com/?daddr={lat},{lng}
  
  f) Add a small Leaflet map at top showing pins for all resources.
     Reuse CrisisMap or a simple new MapContainer with just resource markers.

STEP 3 — Make report form work end-to-end with Supabase:
  File: components/report/ReportForm.tsx + lib/supabase/reports.ts
  
  The form is 3 steps:
  Step 1: Category grid (13 types from REPORT_CATEGORIES constant)
  Step 2: Severity select + title input + description textarea
  Step 3: Location (auto-detect GPS + show on mini map, or type address)
           + Submit button
  
  On submit: call createReport() from lib/supabase/reports.ts.
  If !isSupabaseConfigured: show banner "Set up Supabase to submit reports — see README"
  If Supabase IS configured: submit and show success with:
    - "✅ Report submitted! It will appear on the map in seconds."
    - Redirect to /map after 2 seconds
  
  Add a progress bar across the top: step 1 of 3, 2 of 3, 3 of 3.

STEP 4 — Create PWA icons:
  Create a simple SVG shield icon programmatically and save as PNG:
  The icon should be a shield shape with "SR" text, teal on navy background.
  
  Create a script at scripts/generate-icons.js that uses the canvas API or
  a simple SVG → data URL approach.
  
  Actually the simplest approach: create public/icons/icon-192.svg and
  public/icons/icon-512.svg as proper SVG files. Browsers can use SVG icons.
  Update manifest.json to reference the SVGs with type "image/svg+xml".
  
  The SVG content: navy (#1B2A4A) background circle, white shield shape,
  "SR" text in teal (#0EA5E9). Make it look clean and professional.

STEP 5 — Add offline support banner:
  In app/layout.tsx or a client wrapper component:
  Detect online/offline with window.addEventListener('online'/'offline').
  Show a banner at top when offline: 
  "⚠️ You are offline — map and reports require connection. Cached data may be stale."
  Style: bg-yellow-500 text-black, full width, dismissible.

STEP 6 — Mobile polish pass:
  Check these pages at 375px width (iPhone SE):
  - /map: TopBar fits, BottomNav has 6 tabs without overflow
  - /report: form steps are full width, touch targets >= 44px
  - /assistant: chat fills screen, input stays above keyboard
  - /resources: cards are full width, Navigate buttons are tappable
  - /route: inputs are full width, route cards scroll
  
  Fix any overflow, z-index, or touch issues you find.

STEP 7 — Deploy to Vercel:
  Run: npm run build
  Fix any build errors (likely TypeScript or missing env vars).
  Then: npx vercel --prod
  
  If vercel CLI isn't installed: npm install -g vercel
  
  In Vercel dashboard after deploy:
  - Settings → Environment Variables → add all .env.local keys
  - Redeploy to pick up env vars
  
  Share the Vercel URL in the team chat.

Fix TypeScript errors. Ensure npm run build passes clean.
```

---

## Final integration (Team Lead — after all 4 PRs merged)

```bash
git checkout main
git pull origin main
npm install --legacy-peer-deps
npm run build     # must pass 0 errors

# Deploy
npx vercel --prod
```

### Vercel env vars to add
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY   (optional)
GROQ_API_KEY                       (or OPENAI_API_KEY / GEMINI_API_KEY)
ACLED_API_KEY
ACLED_EMAIL
HEALTHSITES_API_KEY               (optional)
```

---

## Capability summary

| Stream | Delivers | Est. time |
|--------|---------|-----------|
| 1 — 3D Globe | Interactive globe, layer panel, visual mode selector, landing page routing | 90 min |
| 2 — Intelligence Layers | Live flights (OpenSky + ADSB), seismic rings (USGS), satellites (Celestrak), CCTV panel | 90 min |
| 3 — AI + News + Modes | Multi-provider AI analyst, RSS news, FLIR/NV/CRT working, SITREP generator | 90 min |
| 4 — Civilian + Deploy | Route planner, resources, report form, PWA icons, offline banner, Vercel deploy | 90 min |

**Merge order: 1 → 2 → 3 → 4**

