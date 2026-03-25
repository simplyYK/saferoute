# SafeRoute Intelligence

> A Palantir-style geospatial intelligence platform for crisis navigation — built in hours at the IE University Cursor AI Hackathon, March 2026.

---

## Two modes. One mission.hbhubuuhuhuh

| Mode | Who it's for | What they see |
|---|---|---|
| **Field Mode** (mobile) | Civilians in conflict zones | Simple map, reports, safe routes, SOS |
| **Intelligence Mode** (desktop) | NGOs, journalists, family abroad | 3D globe, flight tracking, seismic data, satellite overhead, CCTV feeds |

---

## Intelligence layers

| Layer | Source | What it shows |
|---|---|---|
| Conflict events | ACLED API | Battle events, explosions, civilian targeting |
| Community hazards | Supabase Realtime | Crowdsourced shelling, checkpoints, safe corridors |
| Commercial flights | OpenSky Network | 6,700+ live aircraft positions |
| Military aircraft | ADSB Exchange | Unfiltered including military, not on FlightRadar24 |
| Seismic activity | USGS Earthquake API | Real-time earthquakes (artillery shows up here too) |
| Satellite orbits | Celestrak | Starlink (comms), spy satellites, ISS |
| CCTV feeds | City DOT cameras | Ground truth: live street images |
| Crisis news | Reuters / BBC / Al Jazeera RSS | Classified as critical / warning / advisory |
| Safe routes | OSRM | Danger-weighted routing |
| Resources | Overpass (OSM) | Hospitals, shelters, water, food |

## Visual modes

| Mode | Effect |
|---|---|
| Standard | Clean dark dashboard |
| FLIR Thermal | Heat-map density, orange-red conflict zones |
| Night Vision | Green phosphor tones, vignette |
| CRT | Scanline overlay, spy-thriller aesthetic |

---

## Tech stack

| Layer | Tech |
|---|---|
| Framework | Next.js 14 (App Router), TypeScript |
| Styling | Tailwind CSS |
| 3D Globe | globe.gl (WebGL) + Google Photorealistic 3D Tiles (optional) |
| 2D Mobile Map | Leaflet + react-leaflet |
| State | Zustand |
| Database | Supabase (PostgreSQL + PostGIS + Realtime) |
| AI | Groq / OpenAI / Gemini (streaming SSE) |
| Data | ACLED, OpenSky, ADSB Exchange, USGS, Celestrak, OSRM, Overpass |
| PWA | Web App Manifest |

---

## Quick start

```bash
git clone https://github.com/simplyYK/saferoute.git
cd saferoute
npm install --legacy-peer-deps
cp .env.example .env.local   # fill in keys
npm run dev
```

Open http://localhost:3000

### Minimum keys to get full experience

| Feature | Key needed | Where to get it |
|---|---|---|
| Reports + realtime | `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` | supabase.com (free) |
| AI chat | `GROQ_API_KEY` | console.groq.com (free) |
| Conflict overlay | `ACLED_API_KEY` | acleddata.com (free) |
| 3D Tiles | `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Cloud Console |
| Everything else | No key needed | Public APIs |

### Supabase setup

Run these in order in your Supabase SQL editor:
1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/seed.sql` (optional — sample Kharkiv data)

---

## Folder structure

```
app/
  page.tsx              Landing page
  map/                  Field mode (mobile map)
  globe/                Intelligence mode (3D dashboard)
  report/               Submit community hazard report
  assistant/            AI crisis chat
  route/                Safe route planner
  resources/            Emergency resources near you
  news/                 Live crisis news feed
  api/
    acled/              Conflict event proxy (ACLED)
    opensky/            Commercial flight tracking
    adsb/               Military/unfiltered aircraft
    seismic/            USGS earthquake feed
    satellites/         Celestrak orbital data
    groq/               AI chat (Groq / OpenAI / Gemini)
    gdelt/              News feed + RSS fallback
    osrm/               Route planning proxy
    overpass/           OSM emergency resources
    healthsites/        Health facility data
components/
  globe/                IntelligenceGlobe, LayerPanel, VisualModeSelector
  map/                  CrisisMap (Leaflet, mobile)
  report/               ReportForm
  chat/                 ChatInterface
  route/                RoutePlanner
  navigation/           TopBar, BottomNav
  shared/               SOSButton, LanguageSwitcher
```

---

## Deploy (Vercel — 2 minutes)

```bash
vercel --prod
```

Add all `.env.local` variables in Vercel project settings → Environment Variables.

---

## Inspiration

Inspired by Bilawal Sidhu's "vibe coding" experiment building a Palantir-like geospatial intelligence dashboard using publicly available data streams and AI agents as conductors.
