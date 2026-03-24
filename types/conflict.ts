export interface ConflictEvent {
  id: string;
  event_date: string;
  event_type: string;
  sub_event_type: string;
  actor1: string;
  actor2: string;
  location: string;
  admin1: string;
  latitude: number;
  longitude: number;
  fatalities: number;
  notes: string;
  source: string;
  severity: "critical" | "high" | "medium" | "low";
}

export interface ConflictGeoJSON {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    geometry: {
      type: "Point";
      coordinates: [number, number];
    };
    properties: ConflictEvent;
  }>;
  cached: boolean;
  count: number;
}
