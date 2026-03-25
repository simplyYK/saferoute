import { create } from "zustand";
import type { RouteData, BBox } from "@/types/map";
import {
  defaultGlobeLayers,
  type GlobeLayerToggles,
} from "@/components/globe/globe-layers";

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
  viewCountry: string;
  activeLayers: MapLayers;
  globeLayers: GlobeLayerToggles;
  selectedRoute: RouteData | null;
  routes: RouteData[];
  isLocating: boolean;
  flyTarget: [number, number] | null;

  setCenter: (center: [number, number]) => void;
  setZoom: (zoom: number) => void;
  setBounds: (bounds: BBox) => void;
  setViewCountry: (country: string) => void;
  toggleLayer: (layer: keyof MapLayers) => void;
  toggleGlobeLayer: (layer: keyof GlobeLayerToggles) => void;
  setGlobeLayers: (layers: GlobeLayerToggles) => void;
  setSelectedRoute: (route: RouteData | null) => void;
  setRoutes: (routes: RouteData[]) => void;
  setIsLocating: (locating: boolean) => void;
  flyTo: (target: [number, number]) => void;
  clearFlyTarget: () => void;
}

export const useMapStore = create<MapState>((set) => ({
  center: [49.9935, 36.2304],
  zoom: 12,
  bounds: null,
  viewCountry: "Ukraine",
  activeLayers: {
    conflictEvents: true,
    reports: true,
    resources: true,
    dangerZones: true,
  },
  globeLayers: defaultGlobeLayers,
  selectedRoute: null,
  routes: [],
  isLocating: false,

  setCenter: (center) => set({ center }),
  setZoom: (zoom) => set({ zoom }),
  setBounds: (bounds) => set({ bounds }),
  setViewCountry: (viewCountry) => set({ viewCountry }),
  toggleLayer: (layer) =>
    set((state) => ({
      activeLayers: { ...state.activeLayers, [layer]: !state.activeLayers[layer] },
    })),
  toggleGlobeLayer: (layer) =>
    set((state) => ({
      globeLayers: { ...state.globeLayers, [layer]: !state.globeLayers[layer] },
    })),
  setGlobeLayers: (globeLayers) => set({ globeLayers }),
  setSelectedRoute: (route) => set({ selectedRoute: route }),
  setRoutes: (routes) => set({ routes }),
  setIsLocating: (locating) => set({ isLocating: locating }),
  flyTarget: null,
  flyTo: (target) => set({ flyTarget: target }),
  clearFlyTarget: () => set({ flyTarget: null }),
}));
