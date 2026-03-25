export interface LatLng {
  lat: number;
  lng: number;
}

export interface BBox {
  south: number;
  west: number;
  north: number;
  east: number;
}

export interface ElevationStats {
  min: number;
  max: number;
  gain: number;
  loss: number;
}

export interface RouteData {
  id: string;
  distance: number;
  distanceKm: number;
  duration: number;
  durationMinutes: number;
  geometry: {
    type: string;
    coordinates: [number, number][];
  };
  steps: Array<{
    instruction: string;
    distance: number;
    duration: number;
    name: string;
  }>;
  safetyScore: number;
  elevationStats?: ElevationStats;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

export interface NewsArticle {
  id: string;
  title: string;
  url: string;
  description?: string;
  imageUrl: string | null;
  source: string;
  publishedAt: string;
  language?: string;
  country?: string;
  severity?: "critical" | "warning" | "advisory" | "info";
}
