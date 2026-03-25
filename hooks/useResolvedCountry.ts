"use client";
import { useState, useEffect } from "react";
import { useAppStore } from "@/store/appStore";
import { useMapStore } from "@/store/mapStore";
import { REGIONS } from "@/lib/constants/regions";

interface ResolvedCountry {
  /** Display name (e.g. "Ukraine", "Spain") */
  country: string;
  /** ISO3 code for HDX HAPI (e.g. "UKR", "ESP") — empty if unknown */
  iso3: string;
  /** Whether it's a recognised conflict region in our list */
  isKnownRegion: boolean;
  /** True while reverse-geocoding is in progress */
  resolving: boolean;
}

// Simple ISO2→ISO3 map for common countries not in REGIONS list
const ISO2_TO_ISO3: Record<string, string> = {
  AF: "AFG", AL: "ALB", DZ: "DZA", AD: "AND", AO: "AGO", AR: "ARG",
  AM: "ARM", AU: "AUS", AT: "AUT", AZ: "AZE", BS: "BHS", BH: "BHR",
  BD: "BGD", BB: "BRB", BY: "BLR", BE: "BEL", BZ: "BLZ", BJ: "BEN",
  BT: "BTN", BO: "BOL", BA: "BIH", BW: "BWA", BR: "BRA", BN: "BRN",
  BG: "BGR", BF: "BFA", BI: "BDI", KH: "KHM", CM: "CMR", CA: "CAN",
  CF: "CAF", TD: "TCD", CL: "CHL", CN: "CHN", CO: "COL", KM: "COM",
  CD: "COD", CG: "COG", CR: "CRI", HR: "HRV", CU: "CUB", CY: "CYP",
  CZ: "CZE", DK: "DNK", DJ: "DJI", DO: "DOM", EC: "ECU", EG: "EGY",
  SV: "SLV", GQ: "GNQ", ER: "ERI", EE: "EST", ET: "ETH", FI: "FIN",
  FR: "FRA", GA: "GAB", GM: "GMB", GE: "GEO", DE: "DEU", GH: "GHA",
  GR: "GRC", GT: "GTM", GN: "GIN", GW: "GNB", GY: "GUY", HT: "HTI",
  HN: "HND", HU: "HUN", IS: "ISL", IN: "IND", ID: "IDN", IR: "IRN",
  IQ: "IRQ", IE: "IRL", IL: "ISR", IT: "ITA", JM: "JAM", JP: "JPN",
  JO: "JOR", KZ: "KAZ", KE: "KEN", KW: "KWT", KG: "KGZ", LA: "LAO",
  LV: "LVA", LB: "LBN", LS: "LSO", LR: "LBR", LY: "LBY", LT: "LTU",
  LU: "LUX", MG: "MDG", MW: "MWI", MY: "MYS", ML: "MLI", MT: "MLT",
  MR: "MRT", MU: "MUS", MX: "MEX", MD: "MDA", MN: "MNG", ME: "MNE",
  MA: "MAR", MZ: "MOZ", MM: "MMR", NA: "NAM", NP: "NPL", NL: "NLD",
  NZ: "NZL", NI: "NIC", NE: "NER", NG: "NGA", MK: "MKD", NO: "NOR",
  OM: "OMN", PK: "PAK", PA: "PAN", PG: "PNG", PY: "PRY", PE: "PER",
  PH: "PHL", PL: "POL", PT: "PRT", QA: "QAT", RO: "ROU", RU: "RUS",
  RW: "RWA", SA: "SAU", SN: "SEN", RS: "SRB", SL: "SLE", SG: "SGP",
  SK: "SVK", SI: "SVN", SO: "SOM", ZA: "ZAF", SS: "SSD", ES: "ESP",
  LK: "LKA", SD: "SDN", SR: "SUR", SZ: "SWZ", SE: "SWE", CH: "CHE",
  SY: "SYR", TW: "TWN", TJ: "TJK", TZ: "TZA", TH: "THA", TG: "TGO",
  TT: "TTO", TN: "TUN", TR: "TUR", TM: "TKM", UG: "UGA", UA: "UKR",
  AE: "ARE", GB: "GBR", US: "USA", UY: "URY", UZ: "UZB", VE: "VEN",
  VN: "VNM", YE: "YEM", ZM: "ZMB", ZW: "ZWE", PS: "PSE",
};

// Cache the resolved result
let resolvedCache: { lat: number; lng: number; country: string; iso3: string } | null = null;

/**
 * Resolves `viewCountry` to an actual country name and ISO3 code.
 * When viewCountry is "My Location", uses reverse geocoding on the user's
 * GPS coordinates to determine the real country.
 */
export function useResolvedCountry(): ResolvedCountry {
  const viewCountry = useMapStore((s) => s.viewCountry);
  const userLocation = useAppStore((s) => s.userLocation);
  const [resolved, setResolved] = useState<{ country: string; iso3: string } | null>(null);
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    if (viewCountry !== "My Location") {
      setResolved(null); // not needed
      return;
    }
    if (!userLocation) {
      setResolved(null);
      return;
    }

    // Check cache
    if (
      resolvedCache &&
      Math.abs(resolvedCache.lat - userLocation.lat) < 0.1 &&
      Math.abs(resolvedCache.lng - userLocation.lng) < 0.1
    ) {
      setResolved({ country: resolvedCache.country, iso3: resolvedCache.iso3 });
      return;
    }

    let cancelled = false;
    setResolving(true);

    fetch(`/api/geocode?lat=${userLocation.lat}&lng=${userLocation.lng}`)
      .then((r) => r.json())
      .then((data: { country?: string; countryCode?: string }) => {
        if (cancelled) return;
        const country = data.country || "Unknown";
        const code2 = data.countryCode || "";
        // Try to find in REGIONS first
        const region = REGIONS.find(
          (r) =>
            r.country.toLowerCase() === country.toLowerCase() ||
            r.countryCode === code2
        );
        const iso3 = region?.iso3 || ISO2_TO_ISO3[code2] || "";
        resolvedCache = { lat: userLocation.lat, lng: userLocation.lng, country, iso3 };
        setResolved({ country, iso3 });
      })
      .catch(() => {
        if (!cancelled) setResolved(null);
      })
      .finally(() => {
        if (!cancelled) setResolving(false);
      });

    return () => { cancelled = true; };
  }, [viewCountry, userLocation]);

  // If it's a normal country (not "My Location"), resolve from REGIONS
  if (viewCountry !== "My Location") {
    const region = REGIONS.find(
      (r) => r.country === viewCountry || r.name === viewCountry
    );
    return {
      country: viewCountry,
      iso3: region?.iso3 || "",
      isKnownRegion: !!region,
      resolving: false,
    };
  }

  // "My Location" — use the resolved value
  if (resolved) {
    const region = REGIONS.find(
      (r) => r.country.toLowerCase() === resolved.country.toLowerCase()
    );
    return {
      country: resolved.country,
      iso3: resolved.iso3,
      isKnownRegion: !!region,
      resolving,
    };
  }

  return { country: "My Location", iso3: "", isKnownRegion: false, resolving: resolving || !userLocation };
}
