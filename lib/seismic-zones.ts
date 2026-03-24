/** Rough bounding boxes for crisis / conflict context (demo heuristics). */
const ZONES: { lat: [number, number]; lng: [number, number] }[] = [
  { lat: [44, 53], lng: [22, 41] }, // Ukraine / Eastern Europe
  { lat: [32, 37], lng: [35, 43] }, // Syria / Levant
  { lat: [31, 33], lng: [34, 36] }, // Gaza / southern Levant
  { lat: [27, 32], lng: [46, 50] }, // Gulf
  { lat: [11, 16], lng: [42, 48] }, // Horn of Africa / Yemen approaches
];

export function isInConflictZone(lat: number, lng: number): boolean {
  return ZONES.some(
    (z) => lat >= z.lat[0] && lat <= z.lat[1] && lng >= z.lng[0] && lng <= z.lng[1]
  );
}
