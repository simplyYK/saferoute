# Sentinel Phase 4 — Comprehensive Feature Pass

## 1. Globe Layer Controls in Dashboard → Persist to Globe View
In `app/intel/page.tsx`, the globe layer toggles in the dashboard view use `useMapStore`'s `globeLayers` state. The globe view loads an iframe of `/globe?embed=true`. The iframe reads the same store but has its own React context.

**Fix**: The globe layers state already uses Zustand's `mapStore.globeLayers` — the issue is the iframe doesn't share state. Replace the iframe approach with direct rendering:
- In the dashboard's "Globe Layer Controls" section, store changes in `mapStore.globeLayers` (already done)
- In the globe view (when switching to `view === "globe"`), instead of rendering an iframe, render the `IntelligenceGlobe` component directly, passing the `globeLayers` from the store
- This means importing and using IntelligenceGlobe directly in the intel page (with dynamic import, ssr: false)
- Remove the iframe-based GlobeFrame

## 2. Seismic Activity — Show All Levels with Scale Legend
In `hooks/useSeismic.ts`, check if it only fetches M4+. Update to fetch all M1+ events. In the Intel dashboard, show a granular breakdown:

Create a seismic legend component showing:
- M1-2: Micro (barely felt) — grey dots
- M2-3: Minor (felt by few) — blue dots  
- M3-4: Light (felt by many, no damage) — yellow dots
- M4-5: Moderate (damage to weak structures) — orange dots
- M5-6: Strong (damage in populated areas) — red dots
- M6+: Major/Great (serious damage, potential tsunami) — dark red pulsing dots

Add this legend to the Intel dashboard seismic card as an expandable section.

## 3. Satellite Layer — Identify Starlink
In `hooks/useSatellites.ts`, check if satellite data distinguishes Starlink. Starlink satellites have "STARLINK" in their name from TLE data. Add a flag `isStarlink` to each satellite and show it differently:
- Starlink: blue dots with wifi icon, tooltip "Starlink — Internet coverage available"
- Other: grey dots with satellite icon

This helps users understand internet connectivity in their area.

## 4. Globe View — Remove Duplicate Dashboard Button
In `app/globe/page.tsx` or wherever the globe is rendered in the intel page, when viewing the globe from the intel page (not standalone), the "Dashboard" button should NOT appear since the view toggle is already in the header bar.

## 5. Fix Data Merging in Intel
Ensure the conflict stats (from HDX HAPI) and conflict events (from ACLED/seed + GDELT) are properly merged. The stat card should show HDX HAPI aggregate numbers, while the map shows individual GDELT + seed markers.

## 6. Flights Data
Check `hooks/useFlights.ts` — ensure OpenSky API is being called correctly. If it's failing silently, add error logging. The Intel dashboard should show actual flight counts.

## 7. Country Search with Google Places Autocomplete
In the RegionPicker (`components/navigation/TopBar.tsx`), the search input should use the existing `/api/google-places` or `/api/google-geocode` endpoint for autocomplete. When typing a country not in REGIONS, show autocomplete suggestions from Google. When selected, fly to that country and set viewCountry.

**Implementation**: Use the existing `LocationSearch` component's autocomplete logic, or directly call `/api/places?query=...` and show results in the dropdown.

## 8. SITREP Close Button Fix
The SITREP modal on the Intel page has a close button, but the one on the Globe page (inside the intel view) might be missing or broken. Ensure ALL SITREP modals have working close buttons with X icon and backdrop click.

## 9. AI Chat — Add Custom Chat Box
The FloatingAIButton opens an AIChatSheet or ChatInterface. Ensure it has:
- A text input at the bottom for typing custom messages
- Send button
- Message history display
- Quick action buttons above the input
If the chat already has this, verify it works.

## 10. Vercel Deployment — AI Configuration
The "AI needs to be configured" message on Vercel happens because no AI API key is set in Vercel's environment variables. The fix is in the code — show a helpful message instead of a generic error:

In `/app/api/groq/route.ts`, when `getProvider()` returns null, return a specific JSON error:
```json
{"error": "ai_not_configured", "message": "Set GROQ_API_KEY, OPENAI_API_KEY, or GEMINI_API_KEY in your environment variables"}
```

In the chat UI, when this error is received, show: "AI assistant requires an API key. Add GROQ_API_KEY to your Vercel environment variables for free AI (groq.com)."

## 11. AI Agent — More Capabilities
Enhance the AI agent's system prompt and tools to access ALL data sources:
- Add tools for: get_conflict_stats (HDX HAPI aggregate data), get_humanitarian_data (IDPs, funding, needs), get_weather, get_news_feed
- The agent should be able to answer: "What's the conflict situation in Sudan?" by calling get_conflict_stats AND get_news
- Add tool: generate_sitrep — creates a situation report from all available data
- Add tool: get_country_deep_dive — returns comprehensive country analysis

## 12. Voice Mode with ElevenLabs
Add a microphone icon next to the chat input. When clicked, open a modal with ElevenLabs Conversational AI widget.

**Implementation**:
- Create `components/chat/VoiceMode.tsx`
- The modal contains an ElevenLabs embedded widget
- Use env vars: `NEXT_PUBLIC_ELEVENLABS_AGENT_ID` for the agent ID
- The embed uses the ElevenLabs Conversational AI widget: `<elevenlabs-convai agent-id="..."></elevenlabs-convai>`
- Load the script: `https://elevenlabs.io/convai-widget/index.js`
- The widget handles speech-to-text, AI response, and text-to-speech
- Style the modal to match the dark theme

Placeholder setup — user just needs to:
1. Create a Conversational AI agent on elevenlabs.io
2. Set `NEXT_PUBLIC_ELEVENLABS_AGENT_ID=their-agent-id` in .env.local

## IMPLEMENTATION ORDER:
1. Fix SITREP close button
2. Add custom chat input to AI chat
3. Google Places autocomplete in region search  
4. Globe layer persistence (replace iframe with direct component)
5. Remove duplicate dashboard button in globe view
6. Seismic all-levels + legend
7. Starlink satellite identification
8. AI agent enhanced tools
9. Voice mode placeholder
10. Vercel AI config fix
11. Build + push

## Build: `tsc --noEmit` + `next build` must pass. Push to `v2-elevation`.
