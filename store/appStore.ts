"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type VisualMode = "standard" | "flir" | "night" | "crt" | "blackout";
/** Globe page uses this alias (same values as map visual modes). */
export type GlobeVisualMode = VisualMode;

interface AppState {
  language: string;
  userLocation: { lat: number; lng: number } | null;
  isOnline: boolean;
  globeVisualMode: VisualMode;
  visualMode: VisualMode;
  demoMode: boolean;
  demoRegion: string | null;
  setLanguage: (lang: string) => void;
  setUserLocation: (location: { lat: number; lng: number } | null) => void;
  setIsOnline: (online: boolean) => void;
  setGlobeVisualMode: (mode: VisualMode) => void;
  setVisualMode: (mode: VisualMode) => void;
  setDemoMode: (on: boolean, region?: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      language: "en",
      userLocation: null,
      isOnline: true,
      globeVisualMode: "standard",
      visualMode: "standard",
      demoMode: false,
      demoRegion: null,
      setLanguage: (language) => set({ language }),
      setUserLocation: (location) => set({ userLocation: location }),
      setIsOnline: (online) => set({ isOnline: online }),
      setGlobeVisualMode: (globeVisualMode) => set({ globeVisualMode }),
      setVisualMode: (visualMode) => set({ visualMode }),
      setDemoMode: (on, region) => set({ demoMode: on, demoRegion: region ?? null }),
    }),
    {
      name: "saferoute-app",
      partialize: (state) => ({
        language: state.language,
        visualMode: state.visualMode,
        globeVisualMode: state.globeVisualMode,
      }),
    }
  )
);
