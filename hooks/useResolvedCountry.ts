"use client";
import { useState, useEffect } from "react";
import { useAppStore } from "@/store/appStore";
import { useMapStore } from "@/store/mapStore";
import { REGIONS } from "@/lib/constants/regions";
import { iso2ToIso3, nameToIso3 } from "@/lib/constants/country-codes";

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
        const iso3 = region?.iso3 || iso2ToIso3(code2) || nameToIso3(country) || "";
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
      iso3: region?.iso3 || nameToIso3(viewCountry) || "",
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
