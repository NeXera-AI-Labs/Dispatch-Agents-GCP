'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { ChevronDown, ChevronUp, Navigation } from 'lucide-react';
import { getDirections, getAssignment } from '@/lib/api';
import type { RouteDirections, DriverAssignment } from '@/lib/types';

// Module-level promise — one load per page lifecycle, survives Strict Mode
let gmapsPromise: Promise<void> | null = null;

function loadGoogleMaps(key: string): Promise<void> {
  if (gmapsPromise) return gmapsPromise;
  gmapsPromise = new Promise((resolve, reject) => {
    // If already loaded (e.g. navigated back), resolve immediately
    if (window.google?.maps) { resolve(); return; }

    // Remove ALL stale Maps script tags (from hot-reload iterations)
    document.querySelectorAll('script[src*="maps.googleapis.com"]').forEach(s => s.remove());

    const callbackName = '__gmapsInit' + Date.now();
    (window as unknown as Record<string, unknown>)[callbackName] = () => {
      delete (window as unknown as Record<string, unknown>)[callbackName];
      resolve();
    };

    const script = document.createElement('script');
    script.id = 'gmaps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=geometry&callback=${callbackName}&loading=async`;
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
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interface Window { google: any; }
}

export function DeliveryMap({ shipToParty, assignmentId, warehouseAddress }: DeliveryMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const routeDrawnRef = useRef(false);
  const [route, setRoute] = useState<RouteDirections | null>(null);
  const [assignment, setAssignment] = useState<DriverAssignment | null>(null);
  const [directionsOpen, setDirectionsOpen] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [error, setError] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load Google Maps
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
    if (!key) { setError(true); return; }
    let cancelled = false;
    loadGoogleMaps(key)
      .then(() => { if (!cancelled) setMapReady(true); })
      .catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, []);

  // Fetch route directions — cap-srv resolves SAP codes to real addresses
  useEffect(() => {
    const origin = warehouseAddress || 'Hamburg, Germany';
    if (!shipToParty) return;
    getDirections(origin, shipToParty)
      .then(setRoute)
      .catch(() => {});
  }, [shipToParty, warehouseAddress]);

  // Poll driver assignment every 30s
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
      mapTypeId: 'roadmap',
      zoom: 5,
      center: { lat: 51.1657, lng: 10.4515 },
      zoomControl: true,
      styles: [
        { elementType: 'geometry', stylers: [{ color: '#1d2c3f' }] },
        { elementType: 'labels.text.fill', stylers: [{ color: '#8ec3f5' }] },
        { elementType: 'labels.text.stroke', stylers: [{ color: '#1a2a3f' }] },
        { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2d4a6e' }] },
        { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0d1f33' }] },
      ],
    });
  }, [mapReady]);

  // Draw route once map and route are both ready
  useEffect(() => {
    if (!mapInstanceRef.current || !route || routeDrawnRef.current) return;
    routeDrawnRef.current = true;
    const map = mapInstanceRef.current;

    map.fitBounds(new window.google.maps.LatLngBounds(
      { lat: route.bounds_southwest_lat, lng: route.bounds_southwest_lng },
      { lat: route.bounds_northeast_lat, lng: route.bounds_northeast_lng }
    ));

    try {
      const raw = JSON.parse(route.rawData);
      const encoded = raw.routes?.[0]?.overview_polyline?.points;
      if (encoded && window.google.maps.geometry) {
        new window.google.maps.Polyline({
          path: window.google.maps.geometry.encoding.decodePath(encoded),
          geodesic: true, strokeColor: '#6366f1', strokeOpacity: 0.9, strokeWeight: 4, map,
        });
      }
    } catch { /* no polyline */ }

    if (route.steps.length > 0) {
      new window.google.maps.Marker({
        position: { lat: route.steps[0].startLat, lng: route.steps[0].startLng },
        map, title: 'Origin',
        icon: { path: window.google.maps.SymbolPath.CIRCLE, scale: 7, fillColor: '#4ade80', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2 },
      });
    }
    const last = route.steps[route.steps.length - 1];
    if (last) {
      new window.google.maps.Marker({
        position: { lat: last.endLat, lng: last.endLng },
        map, title: 'Destination',
        icon: { path: window.google.maps.SymbolPath.CIRCLE, scale: 7, fillColor: '#f43f5e', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2 },
      });
    }
  }, [mapReady, route]);

  // Update driver pin
  useEffect(() => {
    if (!mapInstanceRef.current || !assignment?.CurrentLat || !assignment?.CurrentLng) return;
    const pos = { lat: assignment.CurrentLat, lng: assignment.CurrentLng };
    if (markerRef.current) {
      markerRef.current.setPosition(pos);
    } else {
      markerRef.current = new window.google.maps.Marker({
        position: pos, map: mapInstanceRef.current,
        title: assignment.DriverName || 'Driver',
        icon: { url: 'https://maps.google.com/mapfiles/ms/icons/truck.png', scaledSize: new window.google.maps.Size(32, 32) },
      });
    }
  }, [assignment]);

  const statusColor = {
    ASSIGNED: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    IN_TRANSIT: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    DELIVERED: 'bg-green-500/20 text-green-300 border-green-500/30',
  };

  if (error) return null;

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
