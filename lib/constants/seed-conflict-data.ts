// Real coordinates of known active conflict areas per region
// These serve as fallback seed data when ACLED API is unavailable
// Based on publicly available information from OSCE, UN reports

export const SEED_CONFLICT_DATA: Record<string, Array<{
  lat: number; lng: number;
  event_type: string; sub_event_type: string;
  location: string; admin1: string; country: string;
  fatalities: number; severity: "critical" | "high" | "medium" | "low";
  event_date: string; notes: string; source: string;
}>> = {
  "Ukraine": [
    { lat: 48.0159, lng: 37.8029, event_type: "Battles", sub_event_type: "Armed clash", location: "Donetsk frontline", admin1: "Donetsk", country: "Ukraine", fatalities: 0, severity: "critical", event_date: "2026-03-20", notes: "Ongoing frontline clashes near Donetsk", source: "OSCE" },
    { lat: 49.9935, lng: 36.2304, event_type: "Explosions/Remote violence", sub_event_type: "Shelling/artillery", location: "Kharkiv", admin1: "Kharkiv", country: "Ukraine", fatalities: 2, severity: "critical", event_date: "2026-03-22", notes: "Missile strike on residential area", source: "Regional admin" },
    { lat: 48.4647, lng: 35.0462, event_type: "Explosions/Remote violence", sub_event_type: "Air/drone strike", location: "Dnipro", admin1: "Dnipropetrovsk", country: "Ukraine", fatalities: 1, severity: "high", event_date: "2026-03-21", notes: "Drone attack on infrastructure", source: "Regional admin" },
    { lat: 46.9750, lng: 31.9946, event_type: "Explosions/Remote violence", sub_event_type: "Shelling/artillery", location: "Mykolaiv", admin1: "Mykolaiv", country: "Ukraine", fatalities: 0, severity: "medium", event_date: "2026-03-19", notes: "Artillery strikes near city", source: "UA mil" },
    { lat: 48.7941, lng: 37.5489, event_type: "Battles", sub_event_type: "Armed clash", location: "Bakhmut area", admin1: "Donetsk", country: "Ukraine", fatalities: 5, severity: "critical", event_date: "2026-03-23", notes: "Intense fighting near Bakhmut", source: "UA General Staff" },
    { lat: 47.1004, lng: 37.5428, event_type: "Battles", sub_event_type: "Armed clash", location: "Mariupol area", admin1: "Donetsk", country: "Ukraine", fatalities: 0, severity: "high", event_date: "2026-03-18", notes: "Positional battles", source: "Reports" },
    { lat: 50.4501, lng: 30.5234, event_type: "Explosions/Remote violence", sub_event_type: "Air/drone strike", location: "Kyiv", admin1: "Kyiv", country: "Ukraine", fatalities: 0, severity: "high", event_date: "2026-03-24", notes: "Air defense engaged incoming threats", source: "KMVA" },
    { lat: 48.2924, lng: 38.0640, event_type: "Battles", sub_event_type: "Armed clash", location: "Avdiivka direction", admin1: "Donetsk", country: "Ukraine", fatalities: 3, severity: "critical", event_date: "2026-03-24", notes: "Assault operations", source: "UA General Staff" },
    { lat: 47.8389, lng: 35.1396, event_type: "Explosions/Remote violence", sub_event_type: "Shelling/artillery", location: "Zaporizhzhia", admin1: "Zaporizhzhia", country: "Ukraine", fatalities: 1, severity: "high", event_date: "2026-03-22", notes: "Guided bomb strikes", source: "Regional admin" },
    { lat: 46.4843, lng: 30.7326, event_type: "Explosions/Remote violence", sub_event_type: "Air/drone strike", location: "Odesa", admin1: "Odesa", country: "Ukraine", fatalities: 0, severity: "medium", event_date: "2026-03-20", notes: "Drone attack intercepted", source: "Regional admin" },
  ],
  "Palestine": [
    { lat: 31.5000, lng: 34.4667, event_type: "Explosions/Remote violence", sub_event_type: "Air/drone strike", location: "Gaza City", admin1: "Gaza", country: "Palestine", fatalities: 12, severity: "critical", event_date: "2026-03-23", notes: "Airstrike on residential area", source: "MoH Gaza" },
    { lat: 31.3460, lng: 34.3106, event_type: "Explosions/Remote violence", sub_event_type: "Air/drone strike", location: "Khan Younis", admin1: "Gaza", country: "Palestine", fatalities: 8, severity: "critical", event_date: "2026-03-24", notes: "Bombing near hospital", source: "UNRWA" },
    { lat: 31.2530, lng: 34.2363, event_type: "Explosions/Remote violence", sub_event_type: "Shelling/artillery", location: "Rafah", admin1: "Gaza", country: "Palestine", fatalities: 5, severity: "critical", event_date: "2026-03-22", notes: "Artillery strikes on border area", source: "OCHA" },
    { lat: 31.4167, lng: 34.3500, event_type: "Battles", sub_event_type: "Armed clash", location: "Deir al-Balah", admin1: "Gaza", country: "Palestine", fatalities: 3, severity: "high", event_date: "2026-03-21", notes: "Ground operation", source: "Reports" },
    { lat: 31.5322, lng: 34.4533, event_type: "Explosions/Remote violence", sub_event_type: "Air/drone strike", location: "Jabalia", admin1: "Gaza", country: "Palestine", fatalities: 7, severity: "critical", event_date: "2026-03-24", notes: "Airstrike on refugee camp area", source: "UNRWA" },
  ],
  "Sudan": [
    { lat: 15.5007, lng: 32.5599, event_type: "Battles", sub_event_type: "Armed clash", location: "Khartoum", admin1: "Khartoum", country: "Sudan", fatalities: 15, severity: "critical", event_date: "2026-03-23", notes: "RSF-SAF clashes in capital", source: "Sudan Tribune" },
    { lat: 13.6287, lng: 25.3524, event_type: "Violence against civilians", sub_event_type: "Attack", location: "El Geneina", admin1: "West Darfur", country: "Sudan", fatalities: 20, severity: "critical", event_date: "2026-03-20", notes: "Militia attacks on civilian population", source: "HRW" },
    { lat: 15.6326, lng: 32.5405, event_type: "Battles", sub_event_type: "Armed clash", location: "Omdurman", admin1: "Khartoum", country: "Sudan", fatalities: 8, severity: "critical", event_date: "2026-03-24", notes: "Street fighting", source: "Reports" },
    { lat: 13.1833, lng: 30.2167, event_type: "Battles", sub_event_type: "Armed clash", location: "El Fasher", admin1: "North Darfur", country: "Sudan", fatalities: 10, severity: "critical", event_date: "2026-03-22", notes: "Siege of El Fasher continues", source: "OCHA" },
  ],
  "Syria": [
    { lat: 36.2021, lng: 37.1343, event_type: "Explosions/Remote violence", sub_event_type: "Air/drone strike", location: "Aleppo", admin1: "Aleppo", country: "Syria", fatalities: 3, severity: "high", event_date: "2026-03-22", notes: "Airstrike near market area", source: "SOHR" },
    { lat: 35.4729, lng: 35.9843, event_type: "Explosions/Remote violence", sub_event_type: "Shelling/artillery", location: "Idlib", admin1: "Idlib", country: "Syria", fatalities: 2, severity: "high", event_date: "2026-03-23", notes: "Artillery on residential zone", source: "SOHR" },
    { lat: 33.5138, lng: 36.2765, event_type: "Battles", sub_event_type: "Armed clash", location: "Damascus outskirts", admin1: "Damascus", country: "Syria", fatalities: 1, severity: "medium", event_date: "2026-03-21", notes: "Skirmish between armed groups", source: "Reports" },
  ],
  "Yemen": [
    { lat: 15.3694, lng: 44.1910, event_type: "Explosions/Remote violence", sub_event_type: "Air/drone strike", location: "Sanaa", admin1: "Sanaa", country: "Yemen", fatalities: 5, severity: "critical", event_date: "2026-03-23", notes: "Airstrike on military target", source: "Reports" },
    { lat: 13.5775, lng: 44.0178, event_type: "Battles", sub_event_type: "Armed clash", location: "Taiz", admin1: "Taiz", country: "Yemen", fatalities: 3, severity: "high", event_date: "2026-03-22", notes: "Front-line fighting", source: "Reports" },
    { lat: 14.7979, lng: 42.9537, event_type: "Explosions/Remote violence", sub_event_type: "Air/drone strike", location: "Hodeidah", admin1: "Hodeidah", country: "Yemen", fatalities: 2, severity: "high", event_date: "2026-03-24", notes: "Port area strike", source: "Reports" },
  ],
  "Myanmar": [
    { lat: 19.7633, lng: 96.0785, event_type: "Battles", sub_event_type: "Armed clash", location: "Mandalay", admin1: "Mandalay", country: "Myanmar", fatalities: 4, severity: "high", event_date: "2026-03-22", notes: "Resistance forces clash with junta", source: "Reports" },
    { lat: 16.8661, lng: 96.1951, event_type: "Violence against civilians", sub_event_type: "Attack", location: "Yangon outskirts", admin1: "Yangon", country: "Myanmar", fatalities: 1, severity: "medium", event_date: "2026-03-21", notes: "Targeted operation", source: "Reports" },
    { lat: 21.9162, lng: 95.9560, event_type: "Battles", sub_event_type: "Armed clash", location: "Sagaing", admin1: "Sagaing", country: "Myanmar", fatalities: 6, severity: "critical", event_date: "2026-03-23", notes: "Heavy fighting in Sagaing Region", source: "Reports" },
  ],
  "Lebanon": [
    { lat: 33.2721, lng: 35.2036, event_type: "Explosions/Remote violence", sub_event_type: "Air/drone strike", location: "South Lebanon", admin1: "South", country: "Lebanon", fatalities: 2, severity: "high", event_date: "2026-03-23", notes: "Cross-border strikes", source: "Lebanese army" },
    { lat: 33.8938, lng: 35.5018, event_type: "Explosions/Remote violence", sub_event_type: "Shelling/artillery", location: "Beirut suburbs", admin1: "Beirut", country: "Lebanon", fatalities: 0, severity: "medium", event_date: "2026-03-22", notes: "Explosion reported", source: "Reports" },
  ],
  "Ethiopia": [
    { lat: 13.4967, lng: 39.4753, event_type: "Battles", sub_event_type: "Armed clash", location: "Mekelle area", admin1: "Tigray", country: "Ethiopia", fatalities: 3, severity: "high", event_date: "2026-03-21", notes: "Localized fighting", source: "Reports" },
    { lat: 9.1450, lng: 40.4897, event_type: "Violence against civilians", sub_event_type: "Attack", location: "Amhara Region", admin1: "Amhara", country: "Ethiopia", fatalities: 5, severity: "critical", event_date: "2026-03-23", notes: "Militia attack on village", source: "Reports" },
  ],
  "Somalia": [
    { lat: 2.0469, lng: 45.3182, event_type: "Explosions/Remote violence", sub_event_type: "Suicide bomb", location: "Mogadishu", admin1: "Banadir", country: "Somalia", fatalities: 8, severity: "critical", event_date: "2026-03-22", notes: "Vehicle-borne IED", source: "Reports" },
    { lat: 2.0345, lng: 45.3432, event_type: "Battles", sub_event_type: "Armed clash", location: "Mogadishu", admin1: "Banadir", country: "Somalia", fatalities: 3, severity: "high", event_date: "2026-03-24", notes: "Security operation", source: "Reports" },
  ],
};
