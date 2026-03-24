import type { Flight } from "@/types/intelligence";

const MIL_CALLSIGN = new RegExp(
  [
    "^(RRR|RAF|REACH|CNV|USAF|NATO|EVAC|DUKE|STRIKE|NAVY|MARINE|SAM|QID|RCH|CNV)",
    "|^\\s*RR\\d{3}",
    "|^\\s*NATO\\d",
  ].join(""),
  "i"
);

/** ICAO24 hex blocks often associated with military (heuristic, demo-only). */
function militaryHex(icao24: string): boolean {
  const h = icao24.replace(/^~/, "").toUpperCase();
  if (h.length < 2) return false;
  if (h.startsWith("AE") || h.startsWith("AF")) return true;
  if (h.startsWith("E4") || h.startsWith("7C")) return true;
  return false;
}

export function markMilitary(f: Flight): Flight {
  const cs = (f.callsign ?? "").trim();
  const mil = militaryHex(f.icao24) || (cs.length > 0 && MIL_CALLSIGN.test(cs));
  return { ...f, isMilitary: mil };
}
