'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { Navigation } from 'lucide-react';
import { getAssignment, getSettings } from '@/lib/api';
import type { DriverAssignment } from '@/lib/types';

// Module-level promise — one load per page lifecycle, survives Strict Mode
let gmapsPromise: Promise<void> | null = null;

function loadGoogleMaps(key: string): Promise<void> {
  if (gmapsPromise) return gmapsPromise;
  gmapsPromise = new Promise((resolve, reject) => {
    if (window.google?.maps) { resolve(); return; }

    document.querySelectorAll('script[src*="maps.googleapis.com"]').forEach(s => s.remove());

    const callbackName = '__gmapsInit' + Date.now();
    (window as unknown as Record<string, unknown>)[callbackName] = () => {
      delete (window as unknown as Record<string, unknown>)[callbackName];
      resolve();
    };

    const script = document.createElement('script');
    script.id = 'gmaps-script';
    // v=weekly + marker library for AdvancedMarkerElement (driver pin)
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&v=weekly&libraries=marker&callback=${callbackName}&loading=async`;
    script.async = true;
    script.onerror = () => { gmapsPromise = null; reject(new Error('Maps load failed')); };
    document.head.appendChild(script);
  });
  return gmapsPromise;
}

interface DeliveryMapProps {
  shipToParty?: string;
  assignmentId?: string;
  warehouseAddress?: string;
  onSummary?: (summary: { distance: string; duration: string }) => void;
  height?: number;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interface Window { google: any; }
}

// Map ID required for AdvancedMarkerElement. DEMO_MAP_ID uses Google's default light style,
// which is what the user asked for (matches native maps.google.com look).
const MAP_ID = 'DEMO_MAP_ID';

// SAP sandbox ship-to codes don't geocode — map them to real addresses for the demo.
// Mirrors the same mapping in cap-srv/srv/gmap_srv.js so behaviour is consistent
// whether the route comes from cap-srv or DirectionsService client-side.
const ADDRESS_MAP: Record<string, string> = {
  '1710': 'Heidenkampsweg 58, Hamburg, Germany',
  '17100001': 'Dammtorstraße 1, Hamburg, Germany',
  '17100003': 'Mönckebergstraße 7, Hamburg, Germany',
  '17100006': 'Spitalerstraße 10, Hamburg, Germany',
};
const resolveAddress = (s?: string) => (s && ADDRESS_MAP[s]) || s || '';

export function DeliveryMap({ shipToParty, assignmentId, warehouseAddress, onSummary, height = 420 }: DeliveryMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const directionsRendererRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const driverMarkerRef = useRef<any>(null);
  const [assignment, setAssignment] = useState<DriverAssignment | null>(null);
  const [summary, setSummary] = useState<{ distance: string; duration: string } | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 1. Load Google Maps (build-time key first, then tenant settings fallback)
  useEffect(() => {
    let cancelled = false;
    const buildKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
    const start = (key?: string) => {
      if (!key) { setError('Google Maps API key not configured'); return; }
      loadGoogleMaps(key)
        .then(() => { if (!cancelled) setMapReady(true); })
        .catch(() => { if (!cancelled) setError('Failed to load Google Maps'); });
    };
    if (buildKey) {
      start(buildKey);
    } else {
      getSettings()
        .then(s => { if (!cancelled) start(s.google_maps_key); })
        .catch(() => { if (!cancelled) setError('Could not load Maps key from settings'); });
    }
    return () => { cancelled = true; };
  }, []);

  // 2. Initialize map once Google Maps is ready
  useEffect(() => {
    if (!mapReady || !mapRef.current || mapInstanceRef.current) return;
    mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
      mapId: MAP_ID,
      mapTypeId: 'roadmap',
      zoom: 5,
      center: { lat: 51.1657, lng: 10.4515 },
      zoomControl: true,
      streetViewControl: false,
      fullscreenControl: true,
      mapTypeControl: false,
    });
    // DirectionsRenderer draws the canonical Google Maps route — dual-tone polyline,
    // A/B markers with addresses, distance/duration balloons. Same look as maps.google.com.
    directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
      map: mapInstanceRef.current,
      suppressMarkers: false,
      polylineOptions: {
        strokeColor: '#4285F4', // Google Maps blue
        strokeWeight: 6,
        strokeOpacity: 0.9,
      },
    });
  }, [mapReady]);

  // 3. Fetch & render directions whenever shipToParty or warehouseAddress changes
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !shipToParty) return;
    const origin = warehouseAddress || 'Hamburg, Germany';
    const destination = resolveAddress(shipToParty);

    const ds = new window.google.maps.DirectionsService();
    ds.route(
      {
        origin,
        destination,
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (result: any, status: string) => {
        if (status !== 'OK' || !result) {
          setError(`No route found (${status})`);
          return;
        }
        directionsRendererRef.current?.setDirections(result);
        const leg = result.routes?.[0]?.legs?.[0];
        if (leg?.distance?.text && leg?.duration?.text) {
          const s = { distance: leg.distance.text, duration: leg.duration.text };
          setSummary(s);
          onSummary?.(s);
        }
      }
    );
  }, [mapReady, shipToParty, warehouseAddress, onSummary]);

  // 4. Poll driver assignment every 30s for live GPS pin
  const fetchAssignment = useCallback(() => {
    if (!assignmentId) return;
    getAssignment(assignmentId).then(setAssignment).catch(() => {});
  }, [assignmentId]);

  useEffect(() => {
    fetchAssignment();
    if (!assignmentId) return;
    pollRef.current = setInterval(fetchAssignment, 30000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [assignmentId, fetchAssignment]);

  // 5. Render/update driver pin (truck emoji) — sits ON TOP of DirectionsRenderer markers
  useEffect(() => {
    if (!mapInstanceRef.current || !assignment?.CurrentLat || !assignment?.CurrentLng) return;
    const pos = { lat: assignment.CurrentLat, lng: assignment.CurrentLng };
    const AdvMarker = window.google.maps.marker?.AdvancedMarkerElement;

    if (driverMarkerRef.current) {
      driverMarkerRef.current.position = pos;
      return;
    }

    if (AdvMarker) {
      const truckEl = document.createElement('div');
      truckEl.style.cssText = 'font-size: 28px; line-height: 1; transform: translateY(-14px); filter: drop-shadow(0 1px 2px rgba(0,0,0,0.4));';
      truckEl.textContent = '🚚';
      driverMarkerRef.current = new AdvMarker({
        position: pos, map: mapInstanceRef.current,
        title: assignment.DriverName || 'Driver',
        content: truckEl,
        zIndex: 9999,
      });
    }
  }, [assignment]);

  const statusColor = {
    ASSIGNED: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    IN_TRANSIT: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    DELIVERED: 'bg-green-500/20 text-green-300 border-green-500/30',
  };

  if (error) {
    return (
      <div className="bg-card border border-border rounded-xl p-5 text-xs text-muted-foreground">
        {error}. Configure it under Admin → Settings, or rebuild with{' '}
        <code className="font-mono">NEXT_PUBLIC_GOOGLE_MAPS_KEY</code>.
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Navigation size={14} className="text-indigo-400" />
          <span className="text-sm font-semibold text-foreground">Route Map</span>
          {summary && <span className="text-xs text-muted-foreground ml-2">{summary.distance} · {summary.duration}</span>}
        </div>
        {assignment && (
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusColor[assignment.Status] ?? statusColor.ASSIGNED}`}>
              {assignment.Status.replaceAll('_', ' ')}
            </span>
            {assignment.LastGpsAt && (
              <span className="text-xs text-muted-foreground">
                GPS {Math.round((Date.now() - new Date(assignment.LastGpsAt).getTime()) / 60000)}m ago
              </span>
            )}
          </div>
        )}
      </div>

      <div ref={mapRef} className="w-full" style={{ height }}>
        {!mapReady && (
          <div className="w-full h-full flex items-center justify-center bg-slate-900">
            <span className="text-sm text-muted-foreground">Loading map…</span>
          </div>
        )}
      </div>
    </div>
  );
}
