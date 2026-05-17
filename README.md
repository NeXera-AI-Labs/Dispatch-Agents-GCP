# NeXera — AI-Powered Logistics Dispatch Platform

**Hackathon:** Google for Startups AI Agents Challenge — Deadline: 2026-05-25  
**Author:** Sriram Rokkam

NeXera is a multi-tenant SaaS platform for logistics dispatch — connecting ERP systems (SAP S/4HANA, SAP ECC, Odoo, Oracle) to an AI-powered dispatcher dashboard. Both 1PL (own fleet) and 3PL (managed logistics) operators can run on the same platform.

---

## Architecture

```
Dispatcher / WH Manager (browser)
        │
        ▼
[Vercel: Next.js 14 frontend]
        │  JWT auth (email+password, invite-only)
        │  Multi-tenant: tenant_id scopes all data
        │
        ├── REST ──► [Cloud Run: agents]  ←── FastAPI + LangGraph
        │                  │                   Supervisor → Delivery / Driver / Route agents
        │                  │                   Gemini 2.5 Flash via Vertex AI
        │                  │                   MonitorAgent (APScheduler → Teams webhook)
        │                  │
        │            OData ├──► [Cloud Run: cap-srv]  ←── CAP Node.js OData V4
        │                  │           │
        │                  │     [Cloud SQL PostgreSQL]
        │                  │
        │            Maps  ├──► maps.googleapis.com (Directions API)
        │            ERP   └──► SAP S/4HANA OData V2/V4 (live)
        │                       Odoo / Oracle / SAP ECC (coming soon)
        │
        └── ERP credentials in Secret Manager (nexera/{tenant_id}/conn/{conn_id})
```

## Project Structure

```
├── agents/         FastAPI + LangGraph multi-agent system (Python)
│   ├── agents/     Delivery, Driver, Route, Monitor, Supervisor
│   ├── tools/      OData client, route, driver, delivery, teams tools
│   ├── tests/      Unit tests
│   └── CLAUDE.md   Claude Code guidance for this module
├── cap-srv/        CAP Node.js OData V4 services (Cloud Run + PostgreSQL)
│   ├── db/         CDS schema
│   ├── srv/        CDS service definitions + handlers
│   ├── app/        Fiori Elements UI (being replaced by Next.js frontend)
│   ├── migrate.js  Custom schema migration
│   └── Dockerfile  Cloud Run container
├── frontend/       Next.js 14 + Tailwind + shadcn/ui (in development)
└── docs/
    └── superpowers/
        ├── specs/  Design specs
        └── plans/  Implementation plans
```

## GCP Services

| Service | Purpose |
|---------|---------|
| **Cloud Run** × 3 | `cap-srv` (Node.js OData), `agents` (Python LangGraph), `frontend` proxy |
| **Cloud SQL** | PostgreSQL — tenant + warehouse + delivery data |
| **Vertex AI** | Gemini 2.5 Flash for LangGraph agents |
| **Secret Manager** | ERP credentials, API keys, DB passwords |
| **Artifact Registry** | Docker images for Cloud Run |
| **Cloud Build** | CI/CD pipelines |
| **Google Maps Platform** | Directions API for route calculation |

## Deployed Services

| Service | URL | Status |
|---------|-----|--------|
| `cap-srv` | `https://cap-srv-1069189829983.us-central1.run.app` | **Live** |
| `agents` | Cloud Run (Python) | **Live** |
| `frontend` | Vercel (Next.js) | In development |

## GCP Project

- **Project ID:** `agentic-dispatch`
- **Region:** `us-central1`
- **Cloud SQL instance:** `nexera-sbx-db` (PostgreSQL, database: `dispatch`)

## OData Endpoints (cap-srv)

### EwmService — `/odata/v4/ewm/`
Outbound deliveries, items, driver assignments. Proxies SAP S/4HANA sandbox for live ERP data.

### GmapsService — `/odata/v4/gmaps/`
Routes and directions via Google Maps Directions API.

### TrackingService — `/odata/v4/tracking/`
Driver assignment, QR code generation, GPS updates, delivery confirmation.

## Key Design Decisions

- **Multi-tenant**: single deployment, `tenant_id` on every DB table, JWT carries tenant_id
- **Warehouse as master key**: each warehouse number is an independent scope — IT Admin connects ERP, WH Manager assigns users
- **Invite-only auth**: no open registration — WH Manager invites Dispatchers, IT Admin invites WH Managers
- **ERP credentials in Secret Manager**: DB stores only the path `nexera/{tenant_id}/conn/{conn_id}`
- **1PL + 3PL**: 1PL = company manages own fleet; 3PL = logistics operator managing multiple client companies

## Design Spec

Full platform design: [`docs/superpowers/specs/2026-05-16-nexera-platform-design.md`](docs/superpowers/specs/2026-05-16-nexera-platform-design.md)

## Quick Commands

```bash
# Deploy cap-srv to Cloud Run
cd cap-srv && gcloud run deploy cap-srv --source . --region us-central1 --allow-unauthenticated --project agentic-dispatch

# Run schema migration
gcloud run jobs execute cap-srv-migrate --region us-central1 --wait --project agentic-dispatch

# Check cap-srv logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=cap-srv" --project agentic-dispatch --limit 30 --format="value(textPayload)"

# Run agents locally
cd agents && PYTHONPATH=. uvicorn main:app --reload

# Deploy agents to Cloud Run
cd agents && gcloud run deploy agents --source . --region us-central1 --project agentic-dispatch
```

## Deployment Notes

1. **`cds deploy --to postgres` silently fails** with `@sap/cds@9` — use custom `migrate.js` instead
2. **`locale_fallback: true` is required** in `package.json` for `@cap-js/postgres` to avoid `orderByICU` crash
3. **Cloud SQL Auth Proxy uses Unix socket**, not TCP — host must be `/cloudsql/<connection-name>`
4. **Always single-line gcloud commands** in zsh — backslash continuations break
5. See [`docs/superpowers/specs/2026-05-16-nexera-platform-design.md`](docs/superpowers/specs/2026-05-16-nexera-platform-design.md) for full architecture decisions
# Dispatch-Agents-GCP
