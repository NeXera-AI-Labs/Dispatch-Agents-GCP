# CLAUDE.md — NeXera Dispatch

> **Hackathon:** Google for Startups AI Agents Challenge — demo deadline **2026-05-25**
> **Author:** Sriram Rokkam · NeXera-AI-Labs

## What this is

NeXera is a multi-tenant SaaS platform for logistics dispatch — connecting ERP systems (SAP S/4HANA today; Odoo/Oracle/SAP ECC planned) to an AI-powered dispatcher dashboard with real-time driver tracking. Both 1PL (own fleet) and 3PL (managed logistics) operators run on the same platform.

## Architecture

```
                    ┌──────────────────────────────┐
                    │  Dispatcher / WH Manager     │
                    │  (browser, mobile)           │
                    └──────────────┬───────────────┘
                                   │ JWT (email+password, invite-only)
                                   ▼
        ┌──────────────────────────────────────────────────────┐
        │  Cloud Run: frontend  (Next.js 14 App Router)        │
        │  - Tailwind + shadcn/ui, dark slate/indigo theme     │
        │  - Tenant scoping on every query                     │
        │  - /api/cap/* and /api/agents/* server-side proxies  │
        └────┬───────────────┬────────────────┬─────────────────┘
             │               │                │
       OData V4         REST /chat      Cloud SQL (pg)
             │               │                │ direct (Prisma-less, pg client)
             ▼               ▼                ▼
    ┌────────────┐    ┌────────────┐   ┌──────────────────────────┐
    │ Cloud Run: │    │ Cloud Run: │   │ Cloud SQL: nexera-sbx-db │
    │  cap-srv   │    │   agents   │   │  (db-f1-micro shared)    │
    │ CAP Node.js│    │ FastAPI +  │   │  database: dispatch      │
    │ OData V4   │◄───┤ LangGraph  │   │  - users, tenants,       │
    └─────┬──────┘    └─────┬──────┘   │    invites, warehouses,  │
          │                 │           │    connections, settings │
          │                 │           │  - DriverAssignment,     │
          │                 │           │    LocationUpdate,       │
          │                 │           │    OutboundDeliveries    │
          ▼                 ▼           └──────────────────────────┘
    SAP S/4HANA       Vertex AI
    Sandbox OData     Gemini 2.5 Flash
                      ┌──────────────┐
                      │ Teams webhook│  (MonitorAgent alerts)
                      └──────────────┘
```

All three Cloud Run services live in `us-central1`, project `agentic-dispatch`.

## Repo structure

```
.
├── agents/                  FastAPI + LangGraph (Python 3.11)
│   ├── agents/              Supervisor + Delivery/Driver/Route/Monitor agents
│   ├── tools/               OData client, delivery/driver/route/teams tools
│   ├── tests/               pytest unit tests
│   ├── main.py              FastAPI app (port 8000 local, 8080 Cloud Run)
│   ├── ai_core.py           ChatVertexAI wrapper
│   ├── config.py            pydantic-settings
│   └── Dockerfile           Cloud Run image
├── cap-srv/                 SAP CAP Node.js OData V4 backend
│   ├── db/                  CDS schemas (gmaps_schema, iot_schema)
│   ├── srv/                 ewm_srv, gmap_srv, tracking_srv, teams_notify
│   ├── app/                 Legacy Fiori Elements UI (kept as fallback)
│   └── Dockerfile           Cloud Run image
├── frontend/nexera-dispatch/  Next.js 14 + Tailwind + shadcn/ui
│   ├── app/
│   │   ├── api/             Server-side route handlers (auth, cap proxy,
│   │   │                    agents proxy, connections, settings, warehouses)
│   │   ├── dashboard/
│   │   │   ├── admin/       Tenant onboarding wizard, ERP connections
│   │   │   ├── dispatch/    Delivery list + per-delivery dispatch page
│   │   │   └── warehouse/   Warehouse manager screens
│   │   ├── tracking/[id]/   Public driver tracking page (QR landing)
│   │   ├── login/           JWT login
│   │   ├── signup/          First-tenant signup
│   │   └── invite/          Invite-token redemption
│   ├── components/          chat-panel, delivery-map, qr-display, etc.
│   ├── lib/                 api, auth, db (pg client), types, utils
│   ├── scripts/migrate.sql  Postgres schema for users/tenants/...
│   ├── Dockerfile           Multi-stage Next.js standalone build
│   └── Dockerfile.migrate   One-shot Cloud Run job to apply migrate.sql
├── docs/superpowers/        Specs + implementation plans
├── cloudbuild.yaml          Root-level CI/CD (frontend + agents + cap update)
└── CLAUDE.md                (this file)
```

## Functionality (current)

### 1. Tenant + Auth (frontend → Postgres)
- **Signup:** creates first tenant + admin user. JWT issued with `tenant_id`, `user_id`, `role`.
- **Invite flow:** admin invites users by email + role + warehouse; recipient sets password via token link.
- **Login:** email + password → JWT in localStorage. All `/api/*` routes verify JWT server-side.
- **Multi-tenancy:** every Postgres query scoped by `tenant_id`. Warehouse-level access via `user_warehouses`.

### 2. ERP Connection Wizard (admin)
- Configure connection to SAP S/4HANA (sandbox API for the demo).
- Stores `base_url` + `secret_ref` (Secret Manager path) in `connections` table.
- Warehouse list pulled live from connected ERP.

### 3. Dispatch Dashboard (dispatcher)
- Lists outbound deliveries from SAP via `cap-srv` (OData V4).
- Per-delivery page shows items, ship-to address, route map.
- Assign driver: name + mobile + truck reg → `cap-srv:assignDriver` → creates `DriverAssignment` + QR code.
- QR code links to public `/tracking/{assignmentId}` Next.js page.

### 4. Driver Tracking (mobile, no auth)
- Driver opens QR link on phone → `/tracking/[id]`.
- Browser geolocation `watchPosition` + 60s polling → POST `cap-srv:updateLocation`.
- On "Confirm Delivery" → POST `cap-srv:confirmDelivery` → status `DELIVERED`, Teams alert.

### 5. Live Map (dispatcher)
- Google Maps Directions API rendering with origin (warehouse) → destination (ship-to).
- Driver pin polled every 30s from `DriverAssignment.CurrentLat/Lng`.
- Turn-by-turn directions panel (collapsible).

### 6. AI Chat Panel (dispatcher dashboard)
- Floating chat panel routed to `agents` service via `/api/agents/chat`.
- Supervisor classifies → DeliveryAgent / DriverAgent / RouteAgent.
- Tools: list/get deliveries, get items, list drivers, get assignment by delivery doc, route directions.
- Conversation memory per `thread_id` (MemorySaver).

### 7. Background Monitoring (agents)
- `MonitorAgent` runs on APScheduler (every N minutes inside the agents container).
- Detects overdue deliveries → posts to Teams webhook.

## Stack & Cloud

| Layer | Tech | GCP resource |
|---|---|---|
| Frontend | Next.js 14, Tailwind, shadcn/ui, TypeScript | Cloud Run `frontend` |
| OData backend | SAP CAP Node.js (no XSUAA, public) | Cloud Run `cap-srv` |
| AI agents | LangGraph + FastAPI + ChatVertexAI | Cloud Run `agents` |
| LLM | Gemini 2.5 Flash | Vertex AI (us-central1) |
| Database | PostgreSQL 18 | Cloud SQL `nexera-sbx-db` (db-f1-micro shared) |
| Secrets | Secret Manager | `DATABASE_URL`, `JWT_SECRET`, `DB_PASSWORD`, `GOOGLE_MAPS_API_KEY`, `SAP_SANDBOX_API_KEY`, `TEAMS_WEBHOOK_URL` |
| CI/CD | Cloud Build trigger `CICD-GCP-Hackethon` | Auto-deploys on `main` push |
| Image registry | Artifact Registry | `us-central1-docker.pkg.dev/agentic-dispatch/cloud-run-source-deploy` |
| Migrations | Cloud Run job `frontend-migrate` (postgres:17-alpine) | Manual execute |
| Repo | GitHub `NeXera-AI-Labs/Dispatch-Agents-GCP` | branch `main` |

## CI/CD pipeline (`cloudbuild.yaml` at repo root)

Steps run on every push to `main`:

1. `build-frontend` — Docker build with `NEXT_PUBLIC_*` build args
2. `build-agents` — Docker build (parallel with 1)
3. `push-frontend` / `push-agents` — push tagged images to Artifact Registry
4. `deploy-frontend` — `gcloud run deploy` with env vars + secrets + Cloud SQL attachment
5. `deploy-agents` — `gcloud run deploy` with Vertex/CAP env vars + Teams webhook secret
6. `update-cap-srv` — patches `FRONTEND_BASE_URL` env on existing cap-srv revision

DB migrations run **outside** this pipeline as a separate Cloud Run job (Cloud Build can't reach the Cloud SQL Unix socket).

## Local dev

```bash
# Agents (port 8000) — needs agents/.env (template: agents/.env.example)
# Requires: gcloud auth application-default login (Vertex AI ADC)
cd agents && PYTHONPATH=. uvicorn main:app --reload

# Frontend (port 3000)
cd frontend/nexera-dispatch && npm run dev

# cap-srv: deployed on Cloud Run, no local start needed
# https://cap-srv-1069189829983.us-central1.run.app
```

## Frontend gotchas

- `getCurrentUser()` / `getToken()` read localStorage — **always call inside `useEffect`**, never at component body/render level (SSR hydration crash).
- All cap-srv calls from the browser go via `/api/cap/[...path]` Next.js proxy (CORS). Never fetch cap-srv directly from the browser.
- Agents chat goes via `/api/agents/chat` proxy. Use `AGENTS_URL` (server-side only), not `NEXT_PUBLIC_AGENTS_URL`.
- SAP OData fields are PascalCase: `DeliveryDocument`, `ShipToParty`, `HdrGoodsMvtIncompletionStatus`, `DeliveryDate`.
- `getDeliveryItems` is a CAP **action** (POST to `/odata/v4/ewm/getDeliveryItems`) — there is no `OutboundDeliveryItems` entity.
- `OutboundDeliveries` has no `WarehouseNumber` field in the SAP sandbox — do not filter by it.
- Frontend uses Next.js standalone output (`output: 'standalone'`) for the multi-stage Docker build.

## Agents gotchas

- Vertex AI requires ADC locally: `gcloud auth application-default login`. Cloud Run uses the service account automatically.
- `/health` passes without ADC — inference only fails at the first `/chat` call.
- `httpx` percent-encodes `

 in query param keys (`$filter` → `%24filter`), which CAP rejects. `tools/odata_client.py` builds the query string manually with `_build_odata_query`.
- `parse_input` node converts `{"message": "..."}` → `messages: [HumanMessage(...)]`. Don't pass `messages` directly to the graph.
- `classify` node appends an AIMessage (e.g. `"delivery"`) — subagents filter to human messages only via `_user_messages()`.

## Cap-srv gotchas

- Public Cloud Run service (no XSUAA) — auth is enforced at the Next.js layer via JWT.
- `tracking_srv.cds` actions `updateLocation` / `confirmDelivery` are `@requires: 'any'` (driver tracking page is unauthenticated).
- QR code URL points to **Next.js** `/tracking/{id}`, not the legacy Fiori app: `tracking_srv.js` reads `FRONTEND_BASE_URL` env (set by step 6 of the pipeline).

## Security

- **Never** commit `.env`, secrets, or credentials. `.gitignore` covers `*.env`, `.cdsrc-private.json`.
- Sensitive values live in **Secret Manager**, injected at deploy time via `--set-secrets`.
- The `dispatch-user` Postgres password is in `DB_PASSWORD` (raw) and `DATABASE_URL` (URL-encoded inside the connection string). Keep both in sync.

## Deployment status (2026-05-23)

- ✅ Cloud SQL: `nexera-sbx-db` patched to `db-f1-micro` (shared core, ~$10/mo)
- ✅ All 3 Cloud Run services deployed and healthy
- ✅ Cloud Build trigger active, auto-deploys on `main` push
- ⚠️ DB migration job: `Dockerfile.migrate` exists but execution still failing (exit 127) — fix in progress
- ⏭ End-to-end smoke test (signup → dispatch → assign → QR scan → GPS → confirm) pending after migration runs
