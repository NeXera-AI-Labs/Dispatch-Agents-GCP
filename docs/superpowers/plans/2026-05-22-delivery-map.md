# Delivery Map Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a full-width map panel to the delivery detail page showing the planned route, live driver location, distance/ETA, driver status badge, and collapsible turn-by-turn directions.

**Architecture:** A new `DeliveryMap` component loads route directions from cap-srv on mount, renders a Google Maps JS iframe with polyline, and polls the driver assignment every 30s for live GPS. All cap-srv calls go through the existing `/api/cap` Next.js proxy.

**Tech Stack:** Google Maps JavaScript API (loaded via script tag), React hooks (useEffect/useState/useRef), existing `capPost`/`capGet` pattern from `lib/api.ts`

---

### Task 1: Add env var + new types

**Files:**
- Modify: `frontend/nexera-dispatch/.env.local`
- Modify: `frontend/nexera-dispatch/lib/types.ts`

- [ ] **Step 1: Add Google Maps key to .env.local**

Add this line to `frontend/nexera-dispatch/.env.local`:
```
NEXT_PUBLIC_GOOGLE_MAPS_KEY=AIzaSyBpWRMjJ1vrCh8iOv3UghXU-fIxDt_rcPw
```

- [ ] **Step 2: Add RouteDirections and DriverAssignment types to lib/types.ts**

Append to the end of `frontend/nexera-dispatch/lib/types.ts`:
```typescript
export interface RouteStep {
  stepNumber: number;
  instruction: string;
  distance: string;
  duration: string;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  maneuver: string;
}

export interface RouteDirections {
  origin: string;
  destination: string;
  distance: string;
  duration: string;
  bounds_northeast_lat: number;
  bounds_northeast_lng: number;
  bounds_southwest_lat: number;
  bounds_southwest_lng: number;
  rawData: string;
  steps: RouteStep[];
}

export interface DriverAssignment {
  ID: string;
  DeliveryDocument: string;
  MobileNumber: string;
  DriverName: string;
  TruckRegistration: string;
  Status: 'ASSIGNED' | 'IN_TRANSIT' | 'DELIVERED';
  AssignedAt: string;
  DeliveredAt?: string;
  CurrentLat?: number;
  CurrentLng?: number;
  LastGpsAt?: string;
  EstimatedDistance?: string;
  EstimatedDuration?: string;
  QRCodeUrl?: string;
  QRCodeImage?: string;
}
```

- [ ] **Step 3: Commit**
```bash
git add frontend/nexera-dispatch/.env.local frontend/nexera-dispatch/lib/types.ts
git commit -m "feat: add map types and Google Maps env var"
```

---

### Task 2: Add API functions to lib/api.ts

**Files:**
- Modify: `frontend/nexera-dispatch/lib/api.ts`

- [ ] **Step 1: Add getDirections and getAssignment to lib/api.ts**

Add these two exports after the `assignDriver` export in `frontend/nexera-dispatch/lib/api.ts`:
```typescript
export const getDirections = (from: string, to: string) =>
  capPost<RouteDirections>('/odata/v4/gmaps/getDirections', { from, to });

export const getAssignment = (assignmentId: string) =>
  capGet<DriverAssignment>(`/odata/v4/tracking/getAssignment(assignmentId='${assignmentId}')`);
```

Also add `RouteDirections` and `DriverAssignment` to the import at the top of `lib/api.ts`:
```typescript
import type { AuthResponse, InviteDetails, Connection, Warehouse, Delivery, DeliveryItem, TenantSettings, RouteDirections, DriverAssignment } from './types';
```

- [ ] **Step 2: Commit**
```bash
git add frontend/nexera-dispatch/lib/api.ts
git commit -m "feat: add getDirections and getAssignment API calls"
```

---

### Task 3: Build DeliveryMap component

**Files:**
- Create: `frontend/nexera-dispatch/components/delivery-map.tsx`

- [ ] **Step 1: Create delivery-map.tsx**

Create `frontend/nexera-dispatch/components/delivery-map.tsx`:
```typescript
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
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&callback=initGoogleMap`;
    script.async = true;
    script.onerror = () => setError(true);
    document.head.appendChild(script);
    return () => { delete window.initGoogleMap; };
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
              {assignment.Status.replace('_', ' ')}
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
```

- [ ] **Step 2: Commit**
```bash
git add frontend/nexera-dispatch/components/delivery-map.tsx
git commit -m "feat: add DeliveryMap component with route, live driver pin, directions"
```

---

### Task 4: Wire DeliveryMap into delivery detail page

**Files:**
- Modify: `frontend/nexera-dispatch/app/dashboard/dispatch/[deliveryId]/page.tsx`

- [ ] **Step 1: Import DeliveryMap and add assignmentId state**

Add the import at the top of the file (after existing imports):
```typescript
import { DeliveryMap } from '@/components/delivery-map';
```

Add `assignmentId` state alongside the existing `qrImage`/`qrUrl` state:
```typescript
const [assignmentId, setAssignmentId] = useState('');
```

- [ ] **Step 2: Update onAssigned callback to capture assignmentId**

The `DriverAssignForm` currently calls `onAssigned(img, url)`. We need it to also pass the assignment ID. Update the prop in the page:
```typescript
onAssigned={(img, url, id) => { setQrImage(img); setQrUrl(url); if (id) setAssignmentId(id); }}
```

- [ ] **Step 3: Check DriverAssignForm returns assignment ID**

Open `frontend/nexera-dispatch/components/driver-assign-form.tsx` and confirm the `onAssigned` callback signature. If it's `(img: string, url: string)`, update it to `(img: string, url: string, id?: string)` and pass `res.ID` (the assignment UUID returned by cap-srv's `assignDriver`).

Check what cap-srv returns — in `tracking_srv.js`, `assignDriver` returns the full `assignment` object which includes `ID`. So in `driver-assign-form.tsx`, the fetch result will have `.ID`.

- [ ] **Step 4: Add DeliveryMap below the existing grid**

In the return JSX of `DeliveryDetailPage`, add `<DeliveryMap>` after the closing `</div>` of the two-column grid:
```typescript
{delivery && (
  <DeliveryMap
    shippingPoint={delivery.ShippingPoint}
    shipToParty={delivery.ShipToParty}
    assignmentId={assignmentId || undefined}
  />
)}
```

- [ ] **Step 5: Commit**
```bash
git add frontend/nexera-dispatch/app/dashboard/dispatch/[deliveryId]/page.tsx
git commit -m "feat: wire DeliveryMap into delivery detail page"
```

---

### Task 5: Update DriverAssignForm to return assignment ID

**Files:**
- Modify: `frontend/nexera-dispatch/components/driver-assign-form.tsx`

- [ ] **Step 1: Read the current file**

Read `frontend/nexera-dispatch/components/driver-assign-form.tsx` and locate the `onAssigned` prop type and call site.

- [ ] **Step 2: Update onAssigned signature to include assignment ID**

Change the prop type from:
```typescript
onAssigned: (qrImage: string, qrUrl: string) => void;
```
to:
```typescript
onAssigned: (qrImage: string, qrUrl: string, assignmentId?: string) => void;
```

And update the call site where `onAssigned` is invoked to pass the ID:
```typescript
onAssigned(res.QRCodeImage, res.QRCodeUrl, res.ID);
```

Note: `assignDriver` in `lib/api.ts` currently returns `{ QRCodeImage, QRCodeUrl }`. Update the return type to also include `ID`:

In `lib/api.ts`, change:
```typescript
export const assignDriver = (deliveryDoc: string, mobileNumber: string, driverName: string, truckRegistration: string) =>
  capPost<{ QRCodeImage: string; QRCodeUrl: string }>('/odata/v4/tracking/assignDriver', { deliveryDoc, mobileNumber, driverName, truckRegistration });
```
to:
```typescript
export const assignDriver = (deliveryDoc: string, mobileNumber: string, driverName: string, truckRegistration: string) =>
  capPost<{ QRCodeImage: string; QRCodeUrl: string; ID: string }>('/odata/v4/tracking/assignDriver', { deliveryDoc, mobileNumber, driverName, truckRegistration });
```

- [ ] **Step 3: Commit**
```bash
git add frontend/nexera-dispatch/components/driver-assign-form.tsx frontend/nexera-dispatch/lib/api.ts
git commit -m "feat: pass assignment ID through onAssigned callback"
```

---

### Task 6: Manual test

- [ ] **Step 1: Verify cap-srv is running locally**
```bash
curl http://localhost:4004/odata/v4/ewm/OutboundDeliveries?$top=1
```
Expected: JSON with `value` array containing deliveries.

- [ ] **Step 2: Restart Next.js dev server to pick up new env var**
```bash
# Stop current npm run dev, then:
cd frontend/nexera-dispatch && npm run dev
```

- [ ] **Step 3: Open delivery detail page**
- Go to `http://localhost:3000/dashboard/dispatch`
- Click any delivery
- Expect: map panel visible below the two cards, loading map…

- [ ] **Step 4: Verify route renders**
- Map should show a blue polyline from origin to destination
- Green dot = origin, red dot = destination
- Distance + duration shown in the header strip

- [ ] **Step 5: Assign a driver and verify live pin**
- Click "Assign Driver", fill in name/mobile/truck, submit
- Map should show truck pin at driver's current GPS (or no pin if GPS not yet reported)
- Status badge should show "ASSIGNED"

- [ ] **Step 6: Test directions toggle**
- Click "Turn-by-turn directions" → list expands
- Click again → collapses
