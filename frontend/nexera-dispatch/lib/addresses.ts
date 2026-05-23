// SAP sandbox ship-to/shipping-point codes don't geocode — map them to real addresses
// for the demo. Mirrors cap-srv/srv/gmap_srv.js so behaviour is consistent whether
// the route comes from cap-srv or DirectionsService client-side.
const ADDRESS_MAP: Record<string, { street: string; city: string; country: string; label?: string }> = {
  '1710':     { street: 'Heidenkampsweg 58', city: '20097 Hamburg', country: 'Germany', label: 'Plant 1710' },
  '17100001': { street: 'Dammtorstraße 1',   city: '20354 Hamburg', country: 'Germany' },
  '17100003': { street: 'Mönckebergstraße 7', city: '20095 Hamburg', country: 'Germany' },
  '17100006': { street: 'Spitalerstraße 10', city: '20095 Hamburg', country: 'Germany' },
};

export interface ResolvedAddress {
  street: string;
  city: string;
  country: string;
  label?: string;
  /** Single-line geocodable form, e.g. "Heidenkampsweg 58, 20097 Hamburg, Germany". */
  full: string;
}

export function resolveSapAddress(code?: string): ResolvedAddress | null {
  if (!code) return null;
  const a = ADDRESS_MAP[code];
  if (a) {
    return { ...a, full: `${a.street}, ${a.city}, ${a.country}` };
  }
  // Unknown code — fall back to the code itself as a single-line address.
  return { street: code, city: '', country: '', full: code };
}

/** Single-line form for Google geocoder / DirectionsService. */
export function resolveAddressLine(code?: string): string {
  return resolveSapAddress(code)?.full ?? '';
}
