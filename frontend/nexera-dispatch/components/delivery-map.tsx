'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { ChevronDown, ChevronUp, Navigation } from 'lucide-react';
import { getDirections, getAssignment } from '@/lib/api';
import type { RouteDirections, DriverAssignment } from '@/lib/types';

interface DeliveryMapProps {
  shippingPoint?: string;
  shipToParty?: string;
  assignmentId?: string;
}

declare global {
  interface Window {
    google: typeof google;
    initGoogleMap: () => void;
  }
}

export function DeliveryMap({ shippingPoint, shipToParty, assignmentId }: DeliveryMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const [route, setRoute] = useState<RouteDirections | null>(null);
  const [assignment, setAssignment] = useState<DriverAssignment | null>(null);
  const [directionsOpen, setDirectionsOpen] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [error, setError] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load Google Maps script once
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
    if (!key) { setError(true); return; }
    if (window.google?.maps) { setMapReady(true); return; }

    window.initGoogleMap = () => setMapReady(true);
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=geometry&callback=initGoogleMap`;
    script.async = true;
    script.onerror = () => setError(true);
    document.head.appendChild(script);
    return () => {
      delete window.initGoogleMap;
      if (!window.google?.maps) script.remove();
    };
  }, []);

  // Fetch route directions from cap-srv
  useEffect(() => {
    if (!shippingPoint || !shipToParty) return;
    getDirections(shippingPoint, shipToParty)
      .then(setRoute)
      .catch(() => setError(true));
  }, [shippingPoint, shipToParty]);

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

  // Initialize map once Google Maps and route are both ready
  useEffect(() => {
    if (!mapReady || !route || !mapRef.current) return;
    if (mapInstanceRef.current) return; // prevent double init (React Strict Mode)

    const bounds = new window.google.maps.LatLngBounds(
      { lat: route.bounds_southwest_lat, lng: route.bounds_southwest_lng },
      { lat: route.bounds_northeast_lat, lng: route.bounds_northeast_lng }
    );

    const map = new window.google.maps.Map(mapRef.current, {
      mapTypeId: 'roadmap',
      disableDefaultUI: false,
      zoomControl: true,
      styles: [
        { elementType: 'geometry', stylers: [{ color: '#1d2c3f' }] },
        { elementType: 'labels.text.fill', stylers: [{ color: '#8ec3f5' }] },
        { elementType: 'labels.text.stroke', stylers: [{ color: '#1a2a3f' }] },
        { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2d4a6e' }] },
        { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0d1f33' }] },
      ],
    });
    map.fitBounds(bounds);
    mapInstanceRef.current = map;

    // Draw route polyline from rawData
    try {
      const raw = JSON.parse(route.rawData);
      const encoded = raw.routes?.[0]?.overview_polyline?.points;
      if (encoded) {
        new window.google.maps.Polyline({
          path: window.google.maps.geometry
            ? window.google.maps.geometry.encoding.decodePath(encoded)
            : route.steps.map(s => ({ lat: s.startLat, lng: s.startLng })),
          geodesic: true,
          strokeColor: '#6366f1',
          strokeOpacity: 0.9,
          strokeWeight: 4,
          map,
        });
      }
    } catch { /* fallback: no polyline */ }

    // Origin marker
    if (route.steps.length > 0) {
      new window.google.maps.Marker({
        position: { lat: route.steps[0].startLat, lng: route.steps[0].startLng },
        map,
        title: 'Origin',
        icon: { path: window.google.maps.SymbolPath.CIRCLE, scale: 7, fillColor: '#4ade80', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2 },
      });
    }
    // Destination marker
    const last = route.steps[route.steps.length - 1];
    if (last) {
      new window.google.maps.Marker({
        position: { lat: last.endLat, lng: last.endLng },
        map,
        title: 'Destination',
        icon: { path: window.google.maps.SymbolPath.CIRCLE, scale: 7, fillColor: '#f43f5e', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2 },
      });
    }
  }, [mapReady, route]);

  // Update driver pin when assignment GPS changes
  useEffect(() => {
    if (!mapInstanceRef.current || !assignment?.CurrentLat || !assignment?.CurrentLng) return;
    const pos = { lat: assignment.CurrentLat, lng: assignment.CurrentLng };
    if (markerRef.current) {
      markerRef.current.setPosition(pos);
    } else {
      markerRef.current = new window.google.maps.Marker({
        position: pos,
        map: mapInstanceRef.current,
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

  if (error || (!shippingPoint && !shipToParty)) return null;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Navigation size={14} className="text-indigo-400" />
          <span className="text-sm font-semibold text-foreground">Route Map</span>
          {route && (
            <span className="text-xs text-muted-foreground ml-2">
              {route.distance} · {route.duration}
            </span>
          )}
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

      {/* Map */}
      <div ref={mapRef} className="w-full" style={{ height: 320 }}>
        {!mapReady && (
          <div className="w-full h-full flex items-center justify-center bg-slate-900">
            <span className="text-sm text-muted-foreground">Loading map…</span>
          </div>
        )}
      </div>

      {/* Directions toggle */}
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
