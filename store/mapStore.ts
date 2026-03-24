import { create } from "zustand";
import type { RouteData, BBox } from "@/types/map";

interface MapLayers {
  conflictEvents: boolean;
  reports: boolean;
  resources: boolean;
  dangerZones: boolean;
}

interface MapState {
  center: [number, number];
  zoom: number;
  bounds: BBox | null;
  activeLayers: MapLayers;
  selectedRoute: RouteData | null;
  routes: RouteData[];
  isLocating: boolean;

  setCenter: (center: [number, number]) => void;
  setZoom: (zoom: number) => void;
  setBounds: (bounds: BBox) => void;
  toggleLayer: (layer: keyof MapLayers) => void;
  setSelectedRoute: (route: RouteData | null) => void;
  setRoutes: (routes: RouteData[]) => void;
  setIsLocating: (locating: boolean) => void;
}

export const useMapStore = create<MapState>((set) => ({
  center: [49.9935, 36.2304],
  zoom: 12,
  bounds: null,
  activeLayers: {
    conflictEvents: true,
    reports: true,
    resources: true,
    dangerZones: true,
  },
  selectedRoute: null,
  routes: [],
  isLocating: false,

  setCenter: (center) => set({ center }),
  setZoom: (zoom) => set({ zoom }),
  setBounds: (bounds) => set({ bounds }),
  toggleLayer: (layer) =>
    set((state) => ({
      activeLayers: { ...state.activeLayers, [layer]: !state.activeLayers[layer] },
    })),
  setSelectedRoute: (route) => set({ selectedRoute: route }),
  setRoutes: (routes) => set({ routes }),
  setIsLocating: (locating) => set({ isLocating: locating }),
}));
