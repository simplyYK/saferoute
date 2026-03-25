/**
 * Comprehensive country code mapping: name, ISO 3166-1 alpha-2, alpha-3, and FIPS 10-4.
 * Single source of truth for all country lookups across the app.
 *
 * Format: [displayName, iso2, iso3, fips, ...aliases]
 */

const COUNTRIES: readonly (readonly [string, string, string, string, ...string[]])[] = [
  // ── Active conflict / monitored regions (match REGIONS list) ──
  ["Ukraine", "UA", "UKR", "UP"],
  ["Palestine", "PS", "PSE", "GZ", "Gaza / Palestine", "Gaza", "West Bank"],
  ["Sudan", "SD", "SDN", "SU"],
  ["Myanmar", "MM", "MMR", "BM", "Burma"],
  ["Yemen", "YE", "YEM", "YM"],
  ["Syria", "SY", "SYR", "SY"],
  ["Lebanon", "LB", "LBN", "LE"],
  ["Ethiopia", "ET", "ETH", "ET"],
  ["Somalia", "SO", "SOM", "SO"],
  ["Democratic Republic of Congo", "CD", "COD", "CG", "DR Congo", "DRC", "Congo, Dem. Rep.", "Congo-Kinshasa"],
  ["Afghanistan", "AF", "AFG", "AF"],
  ["Iran", "IR", "IRN", "IR", "Islamic Republic of Iran"],
  ["Israel", "IL", "ISR", "IS"],
  ["Iraq", "IQ", "IRQ", "IZ"],
  ["Libya", "LY", "LBY", "LY"],
  ["Haiti", "HT", "HTI", "HA"],
  ["Mali", "ML", "MLI", "ML"],

  // ── All other countries (A-Z) ──
  ["Albania", "AL", "ALB", "AL"],
  ["Algeria", "DZ", "DZA", "AG"],
  ["Andorra", "AD", "AND", "AN"],
  ["Angola", "AO", "AGO", "AO"],
  ["Antigua and Barbuda", "AG", "ATG", "AC"],
  ["Argentina", "AR", "ARG", "AR"],
  ["Armenia", "AM", "ARM", "AM"],
  ["Australia", "AU", "AUS", "AS"],
  ["Austria", "AT", "AUT", "AU"],
  ["Azerbaijan", "AZ", "AZE", "AJ"],
  ["Bahamas", "BS", "BHS", "BF"],
  ["Bahrain", "BH", "BHR", "BA"],
  ["Bangladesh", "BD", "BGD", "BG"],
  ["Barbados", "BB", "BRB", "BB"],
  ["Belarus", "BY", "BLR", "BO"],
  ["Belgium", "BE", "BEL", "BE"],
  ["Belize", "BZ", "BLZ", "BH"],
  ["Benin", "BJ", "BEN", "BN"],
  ["Bhutan", "BT", "BTN", "BT"],
  ["Bolivia", "BO", "BOL", "BL"],
  ["Bosnia and Herzegovina", "BA", "BIH", "BK", "Bosnia"],
  ["Botswana", "BW", "BWA", "BC"],
  ["Brazil", "BR", "BRA", "BR"],
  ["Brunei", "BN", "BRN", "BX", "Brunei Darussalam"],
  ["Bulgaria", "BG", "BGR", "BU"],
  ["Burkina Faso", "BF", "BFA", "UV"],
  ["Burundi", "BI", "BDI", "BY"],
  ["Cabo Verde", "CV", "CPV", "CV", "Cape Verde"],
  ["Cambodia", "KH", "KHM", "CB"],
  ["Cameroon", "CM", "CMR", "CM"],
  ["Canada", "CA", "CAN", "CA"],
  ["Central African Republic", "CF", "CAF", "CT", "CAR"],
  ["Chad", "TD", "TCD", "CD"],
  ["Chile", "CL", "CHL", "CI"],
  ["China", "CN", "CHN", "CH", "People's Republic of China"],
  ["Colombia", "CO", "COL", "CO"],
  ["Comoros", "KM", "COM", "CN"],
  ["Republic of the Congo", "CG", "COG", "CF", "Congo", "Congo-Brazzaville", "Congo Republic"],
  ["Costa Rica", "CR", "CRI", "CS"],
  ["Croatia", "HR", "HRV", "HR"],
  ["Cuba", "CU", "CUB", "CU"],
  ["Cyprus", "CY", "CYP", "CY"],
  ["Czech Republic", "CZ", "CZE", "EZ", "Czechia"],
  ["Denmark", "DK", "DNK", "DA"],
  ["Djibouti", "DJ", "DJI", "DJ"],
  ["Dominica", "DM", "DMA", "DO"],
  ["Dominican Republic", "DO", "DOM", "DR"],
  ["East Timor", "TL", "TLS", "TT", "Timor-Leste"],
  ["Ecuador", "EC", "ECU", "EC"],
  ["Egypt", "EG", "EGY", "EG"],
  ["El Salvador", "SV", "SLV", "ES"],
  ["Equatorial Guinea", "GQ", "GNQ", "EK"],
  ["Eritrea", "ER", "ERI", "ER"],
  ["Estonia", "EE", "EST", "EN"],
  ["Eswatini", "SZ", "SWZ", "WZ", "Swaziland"],
  ["Fiji", "FJ", "FJI", "FJ"],
  ["Finland", "FI", "FIN", "FI"],
  ["France", "FR", "FRA", "FR"],
  ["Gabon", "GA", "GAB", "GB"],
  ["Gambia", "GM", "GMB", "GA", "The Gambia"],
  ["Georgia", "GE", "GEO", "GG"],
  ["Germany", "DE", "DEU", "GM"],
  ["Ghana", "GH", "GHA", "GH"],
  ["Greece", "GR", "GRC", "GR"],
  ["Grenada", "GD", "GRD", "GJ"],
  ["Guatemala", "GT", "GTM", "GT"],
  ["Guinea", "GN", "GIN", "GV"],
  ["Guinea-Bissau", "GW", "GNB", "PU"],
  ["Guyana", "GY", "GUY", "GY"],
  ["Honduras", "HN", "HND", "HO"],
  ["Hungary", "HU", "HUN", "HU"],
  ["Iceland", "IS", "ISL", "IC"],
  ["India", "IN", "IND", "IN"],
  ["Indonesia", "ID", "IDN", "ID"],
  ["Ireland", "IE", "IRL", "EI"],
  ["Italy", "IT", "ITA", "IT"],
  ["Ivory Coast", "CI", "CIV", "IV", "Cote d'Ivoire", "Côte d'Ivoire"],
  ["Jamaica", "JM", "JAM", "JM"],
  ["Japan", "JP", "JPN", "JA"],
  ["Jordan", "JO", "JOR", "JO"],
  ["Kazakhstan", "KZ", "KAZ", "KZ"],
  ["Kenya", "KE", "KEN", "KE"],
  ["Kiribati", "KI", "KIR", "KR"],
  ["Kosovo", "XK", "XKX", "KV"],
  ["Kuwait", "KW", "KWT", "KU"],
  ["Kyrgyzstan", "KG", "KGZ", "KG"],
  ["Laos", "LA", "LAO", "LA", "Lao PDR"],
  ["Latvia", "LV", "LVA", "LG"],
  ["Lesotho", "LS", "LSO", "LT"],
  ["Liberia", "LR", "LBR", "LI"],
  ["Liechtenstein", "LI", "LIE", "LS"],
  ["Lithuania", "LT", "LTU", "LH"],
  ["Luxembourg", "LU", "LUX", "LU"],
  ["Madagascar", "MG", "MDG", "MA"],
  ["Malawi", "MW", "MWI", "MI"],
  ["Malaysia", "MY", "MYS", "MY"],
  ["Maldives", "MV", "MDV", "MV"],
  ["Malta", "MT", "MLT", "MT"],
  ["Marshall Islands", "MH", "MHL", "RM"],
  ["Mauritania", "MR", "MRT", "MR"],
  ["Mauritius", "MU", "MUS", "MP"],
  ["Mexico", "MX", "MEX", "MX"],
  ["Micronesia", "FM", "FSM", "FM", "Federated States of Micronesia"],
  ["Moldova", "MD", "MDA", "MD", "Republic of Moldova"],
  ["Monaco", "MC", "MCO", "MN"],
  ["Mongolia", "MN", "MNG", "MG"],
  ["Montenegro", "ME", "MNE", "MJ"],
  ["Morocco", "MA", "MAR", "MO"],
  ["Mozambique", "MZ", "MOZ", "MZ"],
  ["Namibia", "NA", "NAM", "WA"],
  ["Nauru", "NR", "NRU", "NR"],
  ["Nepal", "NP", "NPL", "NP"],
  ["Netherlands", "NL", "NLD", "NL", "The Netherlands", "Holland"],
  ["New Zealand", "NZ", "NZL", "NZ"],
  ["Nicaragua", "NI", "NIC", "NU"],
  ["Niger", "NE", "NER", "NG"],
  ["Nigeria", "NG", "NGA", "NI"],
  ["North Korea", "KP", "PRK", "KN", "DPRK", "Democratic People's Republic of Korea"],
  ["North Macedonia", "MK", "MKD", "MK", "Macedonia"],
  ["Norway", "NO", "NOR", "NO"],
  ["Oman", "OM", "OMN", "MU"],
  ["Pakistan", "PK", "PAK", "PK"],
  ["Palau", "PW", "PLW", "PS"],
  ["Panama", "PA", "PAN", "PM"],
  ["Papua New Guinea", "PG", "PNG", "PP"],
  ["Paraguay", "PY", "PRY", "PA"],
  ["Peru", "PE", "PER", "PE"],
  ["Philippines", "PH", "PHL", "RP"],
  ["Poland", "PL", "POL", "PL"],
  ["Portugal", "PT", "PRT", "PO"],
  ["Qatar", "QA", "QAT", "QA"],
  ["Romania", "RO", "ROU", "RO"],
  ["Russia", "RU", "RUS", "RS", "Russian Federation"],
  ["Rwanda", "RW", "RWA", "RW"],
  ["Saint Kitts and Nevis", "KN", "KNA", "SC"],
  ["Saint Lucia", "LC", "LCA", "ST"],
  ["Saint Vincent and the Grenadines", "VC", "VCT", "VC"],
  ["Samoa", "WS", "WSM", "WS"],
  ["San Marino", "SM", "SMR", "SM"],
  ["Sao Tome and Principe", "ST", "STP", "TP"],
  ["Saudi Arabia", "SA", "SAU", "SA"],
  ["Senegal", "SN", "SEN", "SG"],
  ["Serbia", "RS", "SRB", "RI"],
  ["Seychelles", "SC", "SYC", "SE"],
  ["Sierra Leone", "SL", "SLE", "SL"],
  ["Singapore", "SG", "SGP", "SN"],
  ["Slovakia", "SK", "SVK", "LO"],
  ["Slovenia", "SI", "SVN", "SI"],
  ["Solomon Islands", "SB", "SLB", "BP"],
  ["South Africa", "ZA", "ZAF", "SF"],
  ["South Korea", "KR", "KOR", "KS", "Republic of Korea", "Korea"],
  ["South Sudan", "SS", "SSD", "OD"],
  ["Spain", "ES", "ESP", "SP"],
  ["Sri Lanka", "LK", "LKA", "CE"],
  ["Suriname", "SR", "SUR", "NS"],
  ["Sweden", "SE", "SWE", "SW"],
  ["Switzerland", "CH", "CHE", "SZ"],
  ["Taiwan", "TW", "TWN", "TW"],
  ["Tajikistan", "TJ", "TJK", "TI"],
  ["Tanzania", "TZ", "TZA", "TZ", "United Republic of Tanzania"],
  ["Thailand", "TH", "THA", "TH"],
  ["Togo", "TG", "TGO", "TO"],
  ["Tonga", "TO", "TON", "TN"],
  ["Trinidad and Tobago", "TT", "TTO", "TD"],
  ["Tunisia", "TN", "TUN", "TS"],
  ["Turkey", "TR", "TUR", "TU", "Türkiye"],
  ["Turkmenistan", "TM", "TKM", "TX"],
  ["Tuvalu", "TV", "TUV", "TV"],
  ["Uganda", "UG", "UGA", "UG"],
  ["United Arab Emirates", "AE", "ARE", "AE", "UAE"],
  ["United Kingdom", "GB", "GBR", "UK", "UK", "Great Britain", "Britain", "England"],
  ["United States", "US", "USA", "US", "United States of America", "USA", "America"],
  ["Uruguay", "UY", "URY", "UY"],
  ["Uzbekistan", "UZ", "UZB", "UZ"],
  ["Vanuatu", "VU", "VUT", "NH"],
  ["Vatican City", "VA", "VAT", "VT", "Holy See"],
  ["Venezuela", "VE", "VEN", "VE"],
  ["Vietnam", "VN", "VNM", "VM", "Viet Nam"],
  ["Zambia", "ZM", "ZMB", "ZA"],
  ["Zimbabwe", "ZW", "ZWE", "ZI"],
] as const;

// ── Lookup maps (built once at module init) ──

/** name (lower) → [iso2, iso3, fips] */
const byName = new Map<string, { iso2: string; iso3: string; fips: string }>();
/** iso2 (upper) → iso3 */
const iso2Map = new Map<string, string>();
/** iso3 (upper) → name */
const iso3NameMap = new Map<string, string>();
/** fips (upper) → name */
const fipsMap = new Map<string, string>();

for (const entry of COUNTRIES) {
  const [name, iso2, iso3, fips, ...aliases] = entry;
  const rec = { iso2, iso3, fips };

  // Index canonical name + aliases (case-insensitive)
  byName.set(name.toLowerCase(), rec);
  for (const alias of aliases) {
    byName.set(alias.toLowerCase(), rec);
  }

  // ISO2 → ISO3 (first entry wins if duplicates)
  if (!iso2Map.has(iso2)) iso2Map.set(iso2, iso3);

  // ISO3 → name
  if (!iso3NameMap.has(iso3)) iso3NameMap.set(iso3, name);

  // FIPS → name (first entry wins)
  if (fips && !fipsMap.has(fips)) fipsMap.set(fips, name);
}

// ── Public API ──

/** Country display name → ISO 3166-1 alpha-3 (case-insensitive) */
export function nameToIso3(name: string): string | undefined {
  return byName.get(name.toLowerCase())?.iso3;
}

/** Country display name → ISO 3166-1 alpha-2 (case-insensitive) */
export function nameToIso2(name: string): string | undefined {
  return byName.get(name.toLowerCase())?.iso2;
}

/** ISO 3166-1 alpha-2 → alpha-3 */
export function iso2ToIso3(iso2: string): string | undefined {
  return iso2Map.get(iso2.toUpperCase());
}

/** ISO 3166-1 alpha-3 → country display name */
export function iso3ToName(iso3: string): string | undefined {
  return iso3NameMap.get(iso3.toUpperCase());
}

/** FIPS 10-4 code → country display name (used by GDELT) */
export function fipsToName(fips: string): string | undefined {
  return fipsMap.get(fips.toUpperCase());
}

/** Country display name → FIPS 10-4 code */
export function nameToFips(name: string): string | undefined {
  return byName.get(name.toLowerCase())?.fips;
}
