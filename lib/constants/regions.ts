export interface RegionConfig {
  id: string;
  name: string;
  country: string; // for ACLED API
  countryCode: string; // ISO 2-letter for healthsites
  center: [number, number]; // [lat, lng]
  zoom: number;
  emergencyNumbers: { label: string; number: string }[];
}

export const REGIONS: RegionConfig[] = [
  {
    id: "ukraine",
    name: "Ukraine",
    country: "Ukraine",
    countryCode: "UA",
    center: [49.9935, 36.2304],
    zoom: 7,
    emergencyNumbers: [
      { label: "General Emergency", number: "112" },
      { label: "Fire", number: "101" },
      { label: "Ambulance", number: "103" },
    ],
  },
  {
    id: "gaza",
    name: "Gaza / Palestine",
    country: "Palestine",
    countryCode: "PS",
    center: [31.4167, 34.3333],
    zoom: 11,
    emergencyNumbers: [
      { label: "Palestinian Red Crescent", number: "101" },
      { label: "Civil Defense", number: "102" },
    ],
  },
  {
    id: "sudan",
    name: "Sudan",
    country: "Sudan",
    countryCode: "SD",
    center: [15.5007, 32.5599],
    zoom: 6,
    emergencyNumbers: [
      { label: "Police", number: "999" },
      { label: "Ambulance", number: "333" },
    ],
  },
  {
    id: "myanmar",
    name: "Myanmar",
    country: "Myanmar",
    countryCode: "MM",
    center: [19.7633, 96.0785],
    zoom: 6,
    emergencyNumbers: [
      { label: "Police", number: "199" },
      { label: "Fire", number: "191" },
      { label: "Ambulance", number: "192" },
    ],
  },
  {
    id: "yemen",
    name: "Yemen",
    country: "Yemen",
    countryCode: "YE",
    center: [15.3694, 44.191],
    zoom: 7,
    emergencyNumbers: [
      { label: "Police", number: "194" },
      { label: "Ambulance", number: "191" },
    ],
  },
  {
    id: "syria",
    name: "Syria",
    country: "Syria",
    countryCode: "SY",
    center: [34.8021, 38.9968],
    zoom: 7,
    emergencyNumbers: [
      { label: "Police", number: "112" },
      { label: "Ambulance", number: "110" },
      { label: "Fire", number: "113" },
    ],
  },
  {
    id: "lebanon",
    name: "Lebanon",
    country: "Lebanon",
    countryCode: "LB",
    center: [33.8547, 35.8623],
    zoom: 9,
    emergencyNumbers: [
      { label: "General Emergency", number: "112" },
      { label: "Red Cross", number: "140" },
    ],
  },
  {
    id: "ethiopia",
    name: "Ethiopia",
    country: "Ethiopia",
    countryCode: "ET",
    center: [9.145, 40.4897],
    zoom: 6,
    emergencyNumbers: [
      { label: "Police", number: "991" },
      { label: "Ambulance", number: "907" },
    ],
  },
  {
    id: "somalia",
    name: "Somalia",
    country: "Somalia",
    countryCode: "SO",
    center: [5.1521, 46.1996],
    zoom: 6,
    emergencyNumbers: [
      { label: "Police", number: "888" },
      { label: "Ambulance", number: "999" },
    ],
  },
  {
    id: "drc",
    name: "DR Congo",
    country: "Democratic Republic of Congo",
    countryCode: "CD",
    center: [-4.0383, 21.7587],
    zoom: 5,
    emergencyNumbers: [
      { label: "Police", number: "112" },
      { label: "Fire", number: "118" },
    ],
  },
  {
    id: "afghanistan",
    name: "Afghanistan",
    country: "Afghanistan",
    countryCode: "AF",
    center: [33.9391, 67.7100],
    zoom: 6,
    emergencyNumbers: [
      { label: "Police", number: "119" },
      { label: "Ambulance", number: "112" },
    ],
  },
];

export function getRegionById(id: string): RegionConfig | undefined {
  return REGIONS.find((r) => r.id === id);
}

export function getRegionByCountry(country: string): RegionConfig | undefined {
  return REGIONS.find(
    (r) =>
      r.country.toLowerCase() === country.toLowerCase() ||
      r.name.toLowerCase() === country.toLowerCase()
  );
}

export const DEFAULT_REGION = REGIONS[0]!;
