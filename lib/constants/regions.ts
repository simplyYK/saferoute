export interface RegionConfig {
  id: string;
  name: string;
  country: string; // for ACLED API
  countryCode: string; // ISO 2-letter for healthsites
  iso3: string; // ISO 3-letter for HDX HAPI
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
    iso3: "UKR",
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
    iso3: "PSE",
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
    iso3: "SDN",
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
    iso3: "MMR",
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
    iso3: "YEM",
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
    iso3: "SYR",
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
    iso3: "LBN",
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
    iso3: "ETH",
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
    iso3: "SOM",
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
    iso3: "COD",
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
    iso3: "AFG",
    center: [33.9391, 67.7100],
    zoom: 6,
    emergencyNumbers: [
      { label: "Police", number: "119" },
      { label: "Ambulance", number: "112" },
    ],
  },
  {
    id: "iran",
    name: "Iran",
    country: "Iran",
    countryCode: "IR",
    iso3: "IRN",
    center: [32.4279, 53.6880],
    zoom: 6,
    emergencyNumbers: [
      { label: "Police", number: "110" },
      { label: "Ambulance", number: "115" },
      { label: "Fire", number: "125" },
    ],
  },
  {
    id: "israel",
    name: "Israel",
    country: "Israel",
    countryCode: "IL",
    iso3: "ISR",
    center: [31.0461, 34.8516],
    zoom: 8,
    emergencyNumbers: [
      { label: "Police", number: "100" },
      { label: "Ambulance (MDA)", number: "101" },
      { label: "Fire", number: "102" },
      { label: "Home Front Command", number: "104" },
    ],
  },
  {
    id: "iraq",
    name: "Iraq",
    country: "Iraq",
    countryCode: "IQ",
    iso3: "IRQ",
    center: [33.2232, 43.6793],
    zoom: 6,
    emergencyNumbers: [
      { label: "Police", number: "104" },
      { label: "Ambulance", number: "122" },
    ],
  },
  {
    id: "libya",
    name: "Libya",
    country: "Libya",
    countryCode: "LY",
    iso3: "LBY",
    center: [26.3351, 17.2283],
    zoom: 6,
    emergencyNumbers: [
      { label: "Police", number: "1515" },
      { label: "Ambulance", number: "1515" },
    ],
  },
  {
    id: "haiti",
    name: "Haiti",
    country: "Haiti",
    countryCode: "HT",
    iso3: "HTI",
    center: [18.9712, -72.2852],
    zoom: 8,
    emergencyNumbers: [
      { label: "Police", number: "114" },
      { label: "Red Cross", number: "2810-1810" },
    ],
  },
  {
    id: "mali",
    name: "Mali",
    country: "Mali",
    countryCode: "ML",
    iso3: "MLI",
    center: [17.5707, -3.9962],
    zoom: 6,
    emergencyNumbers: [
      { label: "Police", number: "17" },
      { label: "Fire/Ambulance", number: "18" },
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
