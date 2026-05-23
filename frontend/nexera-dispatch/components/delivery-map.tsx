'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { ChevronDown, ChevronUp, Navigation } from 'lucide-react';
import { getDirections, getAssignment, getSettings } from '@/lib/api';
import type { RouteDirections, DriverAssignment } from '@/lib/types';

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
    // v=weekly + marker + geometry libraries — required for AdvancedMarkerElement and polyline decoding
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&v=weekly&libraries=geometry,marker&callback=${callbackName}&loading=async`;
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
  onRoute?: (route: RouteDirections) => void;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interface Window { google: any; }
}

// Map ID required for AdvancedMarkerElement + cloud-based map styling.
// "DEMO_MAP_ID" is Google's public demo ID — fine for dev. Replace with a project-owned ID
// from https://console.cloud.google.com/google/maps-apis/studio/maps for production styling.
const MAP_ID = 'DEMO_MAP_ID';

export function DeliveryMap({ shipToParty, assignmentId, warehouseAddress, onRoute }: DeliveryMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const driverMarkerRef = useRef<any>(null);
  const routeDrawnRef = useRef(false);
  const [route, setRoute] = useState<RouteDirections | null>(null);
  const [assignment, setAssignment] = useState<DriverAssignment | null>(null);
  const [directionsOpen, setDirectionsOpen] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [error, setError] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;
    const buildKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
    const start = (key?: string) => {
      if (!key) { setError(true); return; }
      loadGoogleMaps(key)
        .then(() => { if (!cancelled) setMapReady(true); })
        .catch(() => { if (!cancelled) setError(true); });
    };
    if (buildKey) {
      start(buildKey);
    } else {
      getSettings()
        .then(s => { if (!cancelled) start(s.google_maps_key); })
        .catch(() => { if (!cancelled) setError(true); });
    }
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const origin = warehouseAddress || 'Hamburg, Germany';
    if (!shipToParty) return;
    getDirections(origin, shipToParty)
      .then(r => { setRoute(r); onRoute?.(r); })
      .catch(() => {});
  }, [shipToParty, warehouseAddress, onRoute]);

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

  // Initialize map once Google Maps is ready
  useEffect(() => {
    if (!mapReady || !mapRef.current || mapInstanceRef.current) return;
    mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
      mapId: MAP_ID,
      mapTypeId: 'roadmap',
      zoom: 5,
      center: { lat: 51.1657, lng: 10.4515 },
      zoomControl: true,
      // Note: when mapId is set, JS-side `styles` are ignored — styling comes from the cloud-based map.
    });
  }, [mapReady]);

  // Build a coloured pin element for AdvancedMarkerElement
  const buildPin = useCallback((color: string, glyph: string, scale = 1) => {
    if (!window.google?.maps?.marker?.PinElement) return undefined;
    return new window.google.maps.marker.PinElement({
      background: color,
      borderColor: '#ffffff',
      glyphColor: '#ffffff',
      glyph,
      scale,
    }).element;
  }, []);

  // Draw route once map and route are both ready
  useEffect(() => {
    if (!mapInstanceRef.current || !route || routeDrawnRef.current) return;
    routeDrawnRef.current = true;
    const map = mapInstanceRef.current;

    map.fitBounds(new window.google.maps.LatLngBounds(
      { lat: route.bounds_southwest_lat, lng: route.bounds_southwest_lng },
      { lat: route.bounds_northeast_lat, lng: route.bounds_northeast_lng }
    ));

    // Origin/destination — prefer step-derived, fall back to leg.start_location/end_location from raw API.
    let originPt: { lat: number; lng: number } | null = null;
    let destPt:   { lat: number; lng: number } | null = null;

    if (route.steps && route.steps.length > 0) {
      originPt = { lat: route.steps[0].startLat, lng: route.steps[0].startLng };
      const last = route.steps[route.steps.length - 1];
      destPt = { lat: last.endLat, lng: last.endLng };
    }

    let polylinePath: { lat: number; lng: number }[] | null = null;
    try {
      const raw = JSON.parse(route.rawData);
      const apiRoute = raw.routes?.[0] ?? raw; // some payloads store the route, others wrap it
      const leg = apiRoute.legs?.[0];

      if (!originPt && leg?.start_location) originPt = { lat: leg.start_location.lat, lng: leg.start_location.lng };
      if (!destPt   && leg?.end_location)   destPt   = { lat: leg.end_location.lat,   lng: leg.end_location.lng   };

      const encoded = apiRoute.overview_polyline?.points;
      if (encoded && window.google.maps.geometry) {
        polylinePath = window.google.maps.geometry.encoding.decodePath(encoded)
          .map((p: google.maps.LatLng) => ({ lat: p.lat(), lng: p.lng() }));
      }
    } catch { /* fall through */ }

    if (polylinePath) {
      new window.google.maps.Polyline({
        path: polylinePath,
        geodesic: true, strokeColor: '#6366f1', strokeOpacity: 0.9, strokeWeight: 4, map,
      });
    }

    const AdvMarker = window.google.maps.marker?.AdvancedMarkerElement;

    if (originPt) {
      if (AdvMarker) {
        new AdvMarker({ position: originPt, map, title: 'Origin (Warehouse)', content: buildPin('#22c55e', 'A', 1.1) });
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        new (window.google.maps as any).Marker({ position: originPt, map, title: 'Origin' });
      }
    }
    if (destPt) {
      if (AdvMarker) {
        new AdvMarker({ position: destPt, map, title: 'Destination (Ship-to)', content: buildPin('#f43f5e', 'B', 1.1) });
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        new (window.google.maps as any).Marker({ position: destPt, map, title: 'Destination' });
      }
    }
  }, [mapReady, route, buildPin]);

  // Driver pin (live position) — recreated as AdvancedMarkerElement
  useEffect(() => {
    if (!mapInstanceRef.current || !assignment?.CurrentLat || !assignment?.CurrentLng) return;
    const pos = { lat: assignment.CurrentLat, lng: assignment.CurrentLng };
    const AdvMarker = window.google.maps.marker?.AdvancedMarkerElement;

    if (driverMarkerRef.current) {
      driverMarkerRef.current.position = pos;
      return;
    }

    if (AdvMarker) {
      // Truck emoji glyph keeps it readable without external icon assets
      const truckEl = document.createElement('div');
      truckEl.style.cssText = 'font-size: 24px; line-height: 1; transform: translateY(-12px);';
      truckEl.textContent = '🚚';
      driverMarkerRef.current = new AdvMarker({
        position: pos, map: mapInstanceRef.current,
        title: assignment.DriverName || 'Driver',
        content: truckEl,
      });
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      driverMarkerRef.current = new (window.google.maps as any).Marker({
        position: pos, map: mapInstanceRef.current,
        title: assignment.DriverName || 'Driver',
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
        Map unavailable — Google Maps key not configured. Set it in Admin → Settings,
        or rebuild the frontend with <code className="font-mono">NEXT_PUBLIC_GOOGLE_MAPS_KEY</code>.
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Navigation size={14} className="text-indigo-400" />
          <span className="text-sm font-semibold text-foreground">Route Map</span>
          {route && <span className="text-xs text-muted-foreground ml-2">{route.distance} · {route.duration}</span>}
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

      <div ref={mapRef} className="w-full" style={{ height: 320 }}>
        {!mapReady && (
          <div className="w-full h-full flex items-center justify-center bg-slate-900">
            <span className="text-sm text-muted-foreground">Loading map…</span>
          </div>
        )}
      </div>

      {route && route.steps.length > 0 && (
        <div className="border-t border-border">
          <button
            onClick={() => setDirectionsOpen(v => !v)}
            className="w-full flex items-center justify-between px-5 py-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <span>Turn-by-turn directions ({route.steps.length} steps)</span>
            {directionsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {directionsOpen && (
            <div className="px-5 pb-4 space-y-2 max-h-64 overflow-y-auto">
              {route.steps.map(step => (
                <div key={step.stepNumber} className="flex gap-3 text-xs">
                  <span className="text-muted-foreground w-5 shrink-0">{step.stepNumber}.</span>
                  <span className="text-foreground flex-1">{step.instruction}</span>
                  <span className="text-muted-foreground shrink-0">{step.distance}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
