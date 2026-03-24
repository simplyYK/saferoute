# SafeRoute — Crisis Navigation Platform

> Real-time crowdsourced crisis navigation for civilians in conflict zones.

Built at the **IE University Cursor AI Hackathon — March 2026**.

## What it does

- **Live hazard map** — crowdsourced reports (shelling, checkpoints, safe corridors) pinned on an interactive map with real-time Supabase sync
- **Safe route planner** — OSRM routing with safety scoring weighted by proximity to active conflict events
- **AI crisis assistant** — Groq-powered (llama-3.1-8b-instant) streaming chat with crisis-context system prompt
- **Emergency resources** — Hospitals, shelters, water/food points pulled from OpenStreetMap Overpass API and Healthsites.io
- **Conflict news** — GDELT real-time news feed filtered by crisis keywords
- **SOS button** — One-tap emergency message with GPS coords and local emergency numbers
- **6 languages** — English, Ukrainian, Arabic (RTL), French, Spanish, Burmese
- **PWA** — Installable, works offline for static assets

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Map | Leaflet + react-leaflet + react-leaflet-cluster |
| State | Zustand |
| Database | Supabase (PostgreSQL + PostGIS + Realtime) |
| AI | Groq API (llama-3.1-8b-instant, SSE streaming) |
| Data | ACLED, GDELT, OSRM, Overpass API, Healthsites.io, Nominatim |

## Setup

### 1. Install dependencies

```bash
npm install --legacy-peer-deps
```

### 2. Set environment variables

Copy `.env.example` to `.env.local` and fill in:

```bash
cp .env.example .env.local
```

| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase project settings → API |
| `GROQ_API_KEY` | console.groq.com |
| `ACLED_API_KEY` | developer.acleddata.com (free) |
| `HEALTHSITES_API_KEY` | healthsites.io (free) |

### 3. Set up Supabase

Run the migrations in your Supabase SQL editor (in order):

```
supabase/migrations/001_initial_schema.sql
supabase/seed.sql   ← optional sample data (Kharkiv, Ukraine)
```

### 4. Run dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project structure

```
app/
  page.tsx          # Landing page
  map/              # Interactive crisis map
  report/           # Submit hazard report
  assistant/        # AI chat
  route/            # Safe route planner
  resources/        # Emergency resources
  news/             # Crisis news feed
  api/              # Proxy routes (acled, gdelt, osrm, groq, overpass, healthsites)
components/
  map/              # CrisisMap, markers
  report/           # ReportForm (3-step)
  chat/             # ChatInterface (SSE streaming)
  route/            # RoutePlanner
  navigation/       # TopBar, BottomNav
  shared/           # SOSButton, LanguageSwitcher
lib/
  supabase/         # Client + report helpers
  utils/            # Geo math, safety scoring, cn
  constants/        # Report types, resource types, map config
store/              # Zustand stores (map, app)
hooks/              # useReports, useGeolocation, useConflictData, useLanguage
types/              # TypeScript interfaces
public/locales/     # i18n JSON (en, uk, ar, fr, es, my)
supabase/           # Migrations + seed data
```

## Deploy

Deploy to Vercel in one click — all API routes are serverless functions. Set the same env vars in Vercel project settings.

```bash
vercel --prod
```
