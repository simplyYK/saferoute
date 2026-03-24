"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type GlobeVisualMode = "standard" | "flir" | "night" | "crt";

interface AppState {
  language: string;
  userLocation: { lat: number; lng: number } | null;
  isOnline: boolean;
  globeVisualMode: GlobeVisualMode;
  setLanguage: (lang: string) => void;
  setUserLocation: (location: { lat: number; lng: number } | null) => void;
  setIsOnline: (online: boolean) => void;
  setGlobeVisualMode: (mode: GlobeVisualMode) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      language: "en",
      userLocation: null,
      isOnline: true,
      globeVisualMode: "standard",
      setLanguage: (language) => set({ language }),
      setUserLocation: (location) => set({ userLocation: location }),
      setIsOnline: (online) => set({ isOnline: online }),
      setGlobeVisualMode: (globeVisualMode) => set({ globeVisualMode }),
    }),
    {
      name: "saferoute-app",
      partialize: (state) => ({ language: state.language }),
    }
  )
);
