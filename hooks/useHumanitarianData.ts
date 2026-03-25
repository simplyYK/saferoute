"use client";
import { useState, useEffect } from "react";

export interface NationalRisk {
  overall_risk: number;
  hazard_exposure_risk: number;
  vulnerability_risk: number;
  coping_capacity_risk: number;
  location_name?: string;
  reference_period_start?: string;
  reference_period_end?: string;
}

export interface IDPRecord {
  population: number;
  location_name?: string;
  admin1_name?: string;
  reference_period_start?: string;
}

export interface FundingRecord {
  requirements_usd: number;
  funding_usd: number;
  funding_pct: number;
  appeal_name?: string;
  reference_period_start?: string;
  reference_period_end?: string;
}

export interface HumanitarianNeed {
  population_in_need: number;
  population_target: number;
  sector_name?: string;
  reference_period_start?: string;
}

export interface ConflictEventRecord {
  events: number;
  fatalities: number;
  admin1_name?: string;
  reference_period_start?: string;
}

export interface HumanitarianData {
  nationalRisk: NationalRisk | null;
  idps: IDPRecord[];
  funding: FundingRecord[];
  humanNeeds: HumanitarianNeed[];
  conflictEvents: ConflictEventRecord[];
  loading: boolean;
}

async function fetchHDX(endpoint: string, iso3: string, limit = 20) {
  try {
    const res = await fetch(
      `/api/hdx-hapi?endpoint=${encodeURIComponent(endpoint)}&location_code=${iso3}&limit=${limit}`
    );
    if (!res.ok) return { data: [] };
    return await res.json();
  } catch {
    return { data: [] };
  }
}

export function useHumanitarianData(iso3: string): HumanitarianData {
  const [nationalRisk, setNationalRisk] = useState<NationalRisk | null>(null);
  const [idps, setIdps] = useState<IDPRecord[]>([]);
  const [funding, setFunding] = useState<FundingRecord[]>([]);
  const [humanNeeds, setHumanNeeds] = useState<HumanitarianNeed[]>([]);
  const [conflictEvents, setConflictEvents] = useState<ConflictEventRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!iso3) {
      setLoading(false);
      return;
    }
    setLoading(true);

    Promise.all([
      fetchHDX("coordination-context/national-risk", iso3, 5),
      fetchHDX("affected-people/idps", iso3, 20),
      fetchHDX("coordination-context/funding", iso3, 10),
      fetchHDX("affected-people/humanitarian-needs", iso3, 30),
      fetchHDX("coordination-context/conflict-events", iso3, 50),
    ])
      .then(([riskRes, idpsRes, fundingRes, needsRes, conflictRes]) => {
        setNationalRisk(riskRes.data?.[0] || null);
        setIdps(idpsRes.data || []);
        setFunding(fundingRes.data || []);
        setHumanNeeds(needsRes.data || []);
        setConflictEvents(conflictRes.data || []);
      })
      .finally(() => setLoading(false));
  }, [iso3]);

  return { nationalRisk, idps, funding, humanNeeds, conflictEvents, loading };
}
