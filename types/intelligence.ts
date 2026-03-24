export type Flight = {
  icao24: string;
  callsign: string | null;
  lat: number;
  lng: number;
  altitude: number | null;
  velocity: number | null;
  heading: number | null;
  onGround: boolean;
  category: string | null;
  isMilitary?: boolean;
  origin?: string | null;
  destination?: string | null;
};

export type SeismicEvent = {
  id: string;
  lat: number;
  lng: number;
  magnitude: number;
  depth: number | null;
  place: string;
  time: string;
  significance: number | null;
  inConflictZone?: boolean;
};

export type SatelliteType = "starlink" | "military" | "weather";

export type SatelliteTrack = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  altitude: number;
  type: SatelliteType;
  path: [number, number, number][];
};
