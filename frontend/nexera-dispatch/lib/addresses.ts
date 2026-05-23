// SAP sandbox ship-to/shipping-point codes are Hamburg-only and don't reflect our
// demo geography. We override them with Bangalore + Indian destination cities so
// the live tracking demo shows realistic routes around our actual warehouse.
// Mirrors cap-srv/srv/gmap_srv.js for backend-rendered routes.
const ADDRESS_MAP: Record<string, { street: string; city: string; country: string; label?: string }> = {
  // Warehouse / shipping points (origin)
  '1710':     { street: 'ITPL Main Rd, Whitefield', city: 'Bangalore 560066', country: 'India', label: 'Bangalore Warehouse' },

  // Ship-to parties (destinations) — codes seen in SAP sandbox
  '17100001': { street: 'MG Road',                        city: 'Bangalore 560001',  country: 'India' },
  '17100002': { street: 'Electronic City Phase 1',        city: 'Bangalore 560100',  country: 'India' },
  '17100003': { street: 'Indiranagar 100ft Rd',           city: 'Bangalore 560038',  country: 'India' },
  '17100004': { street: 'Sayyaji Rao Rd',                 city: 'Mysore 570001',     country: 'India' },
  '17100005': { street: 'SIPCOT Industrial Complex',      city: 'Hosur 635126',      country: 'India' },
  '17100006': { street: 'BH Road',                        city: 'Tumakuru 572101',   country: 'India' },
  '17100007': { street: 'Anna Salai',                     city: 'Chennai 600002',    country: 'India' },
  '17100008': { street: 'Banjara Hills Rd No. 12',        city: 'Hyderabad 500034',  country: 'India' },
  '17100009': { street: 'FC Road',                        city: 'Pune 411005',       country: 'India' },
  '17100010': { street: 'Marine Drive',                   city: 'Mumbai 400020',     country: 'India' },
};

// Deterministic fallback for unknown codes — always maps to the same destination
// so a delivery doesn't jump cities between page loads.
const FALLBACK_DESTINATIONS: Array<{ street: string; city: string; country: string }> = [
  { street: 'MG Road',                 city: 'Bangalore 560001', country: 'India' },
  { street: 'Electronic City Phase 1', city: 'Bangalore 560100', country: 'India' },
  { street: 'Indiranagar 100ft Rd',    city: 'Bangalore 560038', country: 'India' },
  { street: 'Sayyaji Rao Rd',          city: 'Mysore 570001',    country: 'India' },
  { street: 'SIPCOT Industrial Complex', city: 'Hosur 635126',   country: 'India' },
  { street: 'BH Road',                 city: 'Tumakuru 572101',  country: 'India' },
  { street: 'Anna Salai',              city: 'Chennai 600002',   country: 'India' },
];

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export interface ResolvedAddress {
  street: string;
  city: string;
  country: string;
  label?: string;
  /** Single-line geocodable form, e.g. "MG Road, Bangalore 560001, India". */
  full: string;
}

export function resolveSapAddress(code?: string): ResolvedAddress | null {
  if (!code) return null;
  const a = ADDRESS_MAP[code];
  if (a) {
    return { ...a, full: `${a.street}, ${a.city}, ${a.country}` };
  }
  // Unknown code — pick a deterministic fallback so it stays stable.
  const f = FALLBACK_DESTINATIONS[hashCode(code) % FALLBACK_DESTINATIONS.length];
  return { ...f, full: `${f.street}, ${f.city}, ${f.country}` };
}

/** Single-line form for Google geocoder / DirectionsService. */
export function resolveAddressLine(code?: string): string {
  return resolveSapAddress(code)?.full ?? '';
}
