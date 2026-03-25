export type ResourceType =
  | "hospital"
  | "clinic"
  | "pharmacy"
  | "shelter"
  | "bunker"
  | "water_point"
  | "food_distribution"
  | "police_station"
  | "fire_station"
  | "embassy"
  | "ngo_office"
  | "transit_hub"
  | "charging_station"
  | "wifi_hotspot";

export type ResourceStatus =
  | "open"
  | "closed"
  | "unknown"
  | "overcrowded"
  | "limited_service";

export interface Resource {
  id: string;
  type: ResourceType;
  name: string;
  description: string | null;
  latitude: number;
  longitude: number;
  address: string | null;
  status: ResourceStatus;
  phone: string | null;
  website: string | null;
  operating_hours: string | null;
  capacity: number | null;
  current_occupancy: number | null;
  services: string[];
  source: string;
  verified: boolean;
  distance_km?: number;
  created_at: string;
  updated_at: string;
  /** Raw OSM tags when sourced from Overpass */
  tags?: Record<string, string>;
}
