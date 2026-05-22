# Delivery Map Feature — Design Spec
**Date:** 2026-05-22  
**Status:** Approved

## Overview

Add a full-width map panel to the delivery detail page (`/dashboard/dispatch/[deliveryId]`) showing the planned route, live driver location, distance/ETA, driver status, and collapsible turn-by-turn directions.

## Layout

The map panel sits full-width below the existing two-column grid (delivery info + assign driver/QR). It is always visible when a delivery is open — showing route only before a driver is assigned, and route + live driver pin after assignment.

## Map Panel Contents

1. **Route polyline** — blue line from origin (ShippingPoint address) to destination (ShipToParty address), rendered via Google Maps JS API using bounds from cap-srv RouteDirections
2. **Live driver pin** — truck icon at CurrentLat/CurrentLng from DriverAssignment, refreshes every 30 seconds
3. **Distance + ETA strip** — overlay on map showing `EstimatedDistance · EstimatedDuration` from RouteDirections
4. **Driver status badge** — ASSIGNED / IN TRANSIT / DELIVERED with last GPS timestamp (`LastGpsAt`)
5. **Turn-by-turn directions** — collapsible list below the map, sourced from RouteSteps in cap-srv

## Data Flow

1. Page loads → POST `/api/cap/odata/v4/gmaps/getDirections` with `{ from: shippingPointAddress, to: shipToPartyAddress }` — cap-srv calls Google Maps Directions API, stores and returns RouteDirections + steps
2. Google Maps JS renders the map using returned bounds + polyline from `routeData`
3. If delivery has an active DriverAssignment → poll GET `/api/cap/odata/v4/tracking/getAssignment(assignmentId=...)` every 30s → update truck pin position
4. No driver assigned → map shows route only, truck pin hidden

## New Files

- `components/delivery-map.tsx` — self-contained map component, accepts `delivery`, `assignmentId` as props
- Existing `app/dashboard/dispatch/[deliveryId]/page.tsx` — add `<DeliveryMap>` below the grid

## API Changes

Two new calls added to `lib/api.ts`:
- `getDirections(from, to)` — POST to `/api/cap/odata/v4/gmaps/getDirections`
- `getAssignment(assignmentId)` — GET to `/api/cap/odata/v4/tracking/getAssignment(...)`

## Environment Variables

| Variable | Local (.env.local) | Production (Secret Manager) |
|----------|-------------------|----------------------------|
| `NEXT_PUBLIC_GOOGLE_MAPS_KEY` | `AIzaSyBpWRMjJ1vrCh8iOv3UghXU-fIxDt_rcPw` | Add as `GOOGLE_MAPS_JS_KEY` secret |

## Secrets — Production Gaps (to add before Cloud Run deploy)

| Secret | Status |
|--------|--------|
| `SAP_SANDBOX_API_KEY` | ✅ Already in Secret Manager |
| `GOOGLE_MAPS_API_KEY` | ✅ Already in Secret Manager |
| `GOOGLE_MAPS_JS_KEY` | ❌ Add before frontend deploy |
| `JWT_SECRET` | ❌ Add before frontend deploy |
| `DATABASE_URL` | ❌ Add before frontend deploy |

## Error Handling

- `getDirections` fails (no address data) → map panel hidden, no error shown to user
- Driver GPS unavailable → show route only, badge shows "ASSIGNED" with no timestamp
- Google Maps JS fails to load → map container shows a plain text fallback with distance/ETA only

## Out of Scope

- Historical GPS trail (breadcrumb path)
- Real-time WebSocket/Pub-Sub updates (polling every 30s is sufficient)
- Mobile-optimized driver map (driver uses cap-srv tracking page)
