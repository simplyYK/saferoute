export type GlobeLayerToggles = {
  conflict: boolean;
  reports: boolean;
  flights: boolean;
  military: boolean;
  seismic: boolean;
  satellites: boolean;
  cctv: boolean;
};

export const defaultGlobeLayers: GlobeLayerToggles = {
  conflict: true,
  reports: true,
  flights: false,
  military: false,
  seismic: false,
  satellites: false,
  cctv: false,
};
