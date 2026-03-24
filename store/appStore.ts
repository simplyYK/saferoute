"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AppState {
  language: string;
  userLocation: { lat: number; lng: number } | null;
  isOnline: boolean;
  setLanguage: (lang: string) => void;
  setUserLocation: (location: { lat: number; lng: number } | null) => void;
  setIsOnline: (online: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      language: "en",
      userLocation: null,
      isOnline: true,
      setLanguage: (language) => set({ language }),
      setUserLocation: (location) => set({ userLocation: location }),
      setIsOnline: (online) => set({ isOnline: online }),
    }),
    {
      name: "saferoute-app",
      partialize: (state) => ({ language: state.language }),
    }
  )
);
