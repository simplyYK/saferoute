export const MAP_CONFIG = {
  DEFAULT_LAT: parseFloat(process.env.NEXT_PUBLIC_DEFAULT_LAT || "49.9935"),
  DEFAULT_LNG: parseFloat(process.env.NEXT_PUBLIC_DEFAULT_LNG || "36.2304"),
  DEFAULT_ZOOM: parseInt(process.env.NEXT_PUBLIC_DEFAULT_ZOOM || "12"),
  MIN_ZOOM: 4,
  MAX_ZOOM: 18,
  TILE_URL: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  ATTRIBUTION:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  CLUSTER_MAX_RADIUS: 50,
  CLUSTER_DISABLE_AT_ZOOM: 16,
  MARKER_POPUP_MAX_WIDTH: 280,
  DEFAULT_SEARCH_RADIUS_KM: 25,
} as const;
