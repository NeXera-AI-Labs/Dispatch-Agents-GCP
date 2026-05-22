# NeXera Platform — Full Design Spec

**Version:** 1.0  
**Date:** 2026-05-16  
**Author:** Sriram Rokkam  
**Status:** Approved for implementation

---

## 1. Product Vision

NeXera is an AI-powered dispatch platform for outbound delivery operations. It connects to any ERP system and gives dispatch teams a single intelligent workspace — regardless of which ERP their warehouse runs on, and regardless of whether they are running their own fleet or managing logistics on behalf of other companies.

**The core problem it solves:**  
Dispatch teams — whether in-house or third-party — context-switch between multiple ERP systems, manually assign gig drivers, and have no unified view of outbound deliveries. NeXera eliminates that with one connected platform and an AI agent that works across all systems.

**One-line pitch:**  
> "Connect your SAP, Odoo, or Oracle warehouse — dispatch smarter with AI. From any ERP."

---

## 1a. Who NeXera Serves — Logistics Party Model

NeXera is designed for **1PL and 3PL** operators. The **2PL (end customer)** is the delivery recipient — they never log in but receive automated alerts.

### 1st Party Logistics (1PL) — Company managing its own fleet
The company ships its own goods using its own warehouses, dispatchers, and drivers. NeXera is their internal dispatch platform.

```
Example: FedEx
  └── Signs up as one tenant
  └── Connects their own SAP S/4HANA systems
  └── Manages their own warehouses (Hamburg, Berlin, Munich)
  └── Their dispatchers assign their own gig drivers
  └── Fully self-contained — one company, one tenant
```

**Plan fit:** Starter → Growth (depending on warehouse count)

---

### 3rd Party Logistics (3PL) — Logistics company managing operations for multiple clients
The 3PL operator manages outbound deliveries on behalf of their clients. Each client has their own ERP system. NeXera gives the 3PL a single workspace across all client systems — without the clients needing to access NeXera themselves.

```
Example: DHL Supply Chain (3PL operator)
  └── Signs up as one tenant
  └── Connects Client A's SAP EWM     → Warehouses 0001, 0002
  └── Connects Client B's Odoo        → Warehouse B-Hamburg
  └── Connects Client C's Oracle WMS  → Warehouse C-Frankfurt
  └── DHL dispatchers assigned per warehouse
  └── Each client's data isolated by warehouse number + connection
  └── One NeXera account — many clients served centrally
```

**Plan fit:** Growth → Enterprise (high connection + warehouse count)

---

### 2nd Party (2PL) — The end customer receiving the delivery
The ship-to party. They never log in to NeXera. They are the `ship_to` on the delivery document — their email and mobile are stored so NeXera can send automated delay alerts directly to them.

```
Example: Berlin Supplies GmbH
  └── Placed an order with FedEx or DHL's client
  └── Has no NeXera account
  └── Receives automated email/SMS when their delivery is delayed
  └── Tracked via ship_to_email + ship_to_mobile on the delivery record
```

---

### Why this positioning matters

| Customer Type | Example | Connections | Plan | Monthly Value |
|---|---|---|---|---|
| 1PL (own fleet) | FedEx internal ops | 1–3 | Starter/Growth | $299–$899 |
| 3PL (multi-client) | DHL Supply Chain | 5–20 | Growth/Enterprise | $899–Custom |
| 2PL (recipient) | Berlin Supplies GmbH | None | No account | — |

3PL customers are the highest-value segment — one DHL account replaces what would otherwise require 10+ separate client deployments. This is the primary sales target post-hackathon.

---

## 2. Business Model

### SaaS — Usage-Based Pricing

| Plan | Price | Connections | Warehouses | Deliveries/mo | Seats |
|---|---|---|---|---|---|
| Free Trial | $0 / 14 days | 1 | 1 | 500 | 5 |
| Starter | $299/mo | 3 | 5 | 5,000 | 10 |
| Growth | $899/mo | 10 | Unlimited | 25,000 | Unlimited |
| Enterprise | Custom | Unlimited | Unlimited | Unlimited | Unlimited |

**Billing rules:**
- Starter / Growth: self-serve credit card, monthly or annual (annual = 2 months free)
- Enterprise: sales-led, contract, invoice NET30
- Free trial: no credit card, full access, volume limited
- Usage metric: deliveries processed per month per tenant

**Revenue tracking tables:**
```
tenant_plans  → plan_type, delivery_count_this_month, billing_cycle
```

**Hackathon scope:** Show pricing page and plan selection UI. No real Stripe integration. "Contact Sales" button for Enterprise.

---

## 3. Multi-Tenancy Architecture

### One deployment, fully isolated tenants

NeXera runs as a single deployment on GCP Cloud Run. Every company (FedEx, UPS, DHL) is a separate **tenant** — they share infrastructure but never share data.

```
Tenant: FedEx Logistics GmbH  (tenant_id: fedex-001)
Tenant: UPS Supply Chain       (tenant_id: ups-002)
```

**Isolation mechanism:**
- Every database table has a `tenant_id` column
- Every API call validates `tenant_id` from the JWT token
- FedEx token cannot query UPS rows — enforced at query level

**tenant_id** is created at company signup and never changes.

---

## 4. Role Hierarchy

```
IT Admin (company level)
  └── Created at signup — first user of the tenant
  └── Manages ERP connections and warehouse discovery
  └── Assigns ONE Warehouse Manager per warehouse number

Warehouse Manager (warehouse level)
  └── Assigned by IT Admin to a specific warehouse number
  └── Self-registers via invite link
  └── Assigns Dispatchers and Supervisors to their warehouse
  └── Sees all deliveries for their warehouse

Dispatcher (warehouse level)
  └── Assigned by Warehouse Manager
  └── Self-registers via invite link
  └── Views and manages deliveries for their warehouse only
  └── Assigns gig drivers to deliveries
  └── Generates QR codes for drivers

Supervisor (warehouse level)
  └── Same as Dispatcher + can view cross-dispatcher metrics
  └── Assigned by Warehouse Manager

Driver (no account)
  └── Gig / last-mile worker
  └── No registration, no master table
  └── Receives QR code per delivery from Dispatcher
  └── Scans QR → sees delivery details → marks done
```

**The ownership chain:**
```
IT Admin → owns Connection + Warehouse → assigns WH Manager
WH Manager → owns Users in that WH → assigns Dispatchers/Supervisors
Dispatcher → owns Delivery execution → generates Driver QR per delivery
Driver → owns last mile → no system account needed
```

---

## 5. Warehouse Number as Master Key

The **Warehouse Number** (e.g. `0001`, `0002`) is the primary scoping key throughout the system. It comes directly from the ERP system and is auto-discovered during connection setup.

- Every user is assigned to one or more warehouse numbers
- Every delivery is tagged with a warehouse number
- Every AI agent query is scoped to the session's warehouse number
- Filters in the UI are warehouse-number-aware

A single SAP S/4HANA system can have multiple warehouse numbers — each is treated as an independent warehouse in NeXera with its own manager, team, and delivery scope.

---

## 6. ERP Connector Architecture

### Connector as plugin pattern

Each ERP type is a separate connector module with a common interface:

```
connectors/
  ├── base.js          ← common interface: getDeliveries(), getWarehouse(), etc.
  ├── sap_s4.js        ← SAP S/4HANA implementation (LIVE)
  ├── sap_ecc.js       ← SAP ECC LE-WM (Coming Soon)
  ├── odoo.js          ← Odoo WMS (Coming Soon)
  ├── oracle.js        ← Oracle WMS (Coming Soon)
  └── custom_odata.js  ← Generic OData V4 (Coming Soon)
```

### Universal Delivery Schema

All connectors normalise ERP data to this common schema before storing:

```json
{
  "delivery_id": "8000001",
  "tenant_id": "fedex-001",
  "connection_id": "conn-abc",
  "warehouse_number": "0001",
  "source_erp": "SAP_S4",
  "status": "delayed",
  "planned_gi_date": "2026-05-16",
  "ship_to_name": "Berlin Supplies GmbH",
  "ship_to_address": "Berliner Str. 42, 10115 Berlin",
  "ship_to_email": "logistics@berlin-supplies.de",
  "ship_to_mobile": "+49 30 1234567",
  "shipping_point": "HH01",
  "route": "R001",
  "weight_kg": 342,
  "items": [
    { "item_no": "10", "material": "Industrial Bearings A4", "qty": 50, "unit": "EA" }
  ],
  "driver_name": null,
  "driver_mobile": null,
  "qr_token": null,
  "synced_at": "2026-05-16T10:00:00Z"
}
```

The AI agent always works on this normalised schema — it never knows or cares which ERP the data came from.

### Supported ERP — Hackathon Scope

| ERP | Status | Auth Types | Protocol |
|---|---|---|---|
| SAP S/4HANA (EWM / Outbound Delivery) | ✅ Live | API Key, Basic Auth, OAuth 2.0 | OData V2/V4 |
| SAP ECC (LE-WM) | Coming Soon | Basic Auth | RFC/BAPI |
| Odoo WMS | Coming Soon | API Key, OAuth 2.0 | REST JSON |
| Oracle WMS Cloud | Coming Soon | Bearer Token, OAuth 2.0 | REST |
| Custom OData | Coming Soon | Any | OData V4 |

**Hackathon connector:** SAP API Business Hub sandbox — API Key auth. Multiple API keys from different accounts treated as separate "systems" for demo purposes.

---

## 7. Authentication & Identity

### User Auth (email + password)

- Email + bcrypt password stored in `users` table
- JWT token on login — carries `tenant_id`, `user_id`, `role`, `warehouse_numbers[]`
- Token validated on every API call
- No external OAuth provider required for hackathon

### Invite Flow

Accounts are created by invitation only — no open registration:

```
1. IT Admin enters WH Manager email → invite token created in DB
2. Invite URL shown on screen: nexera.app/invite?token=xxx
3. IT Admin shares manually (copy / WhatsApp / email client)
4. Manager clicks link → validates token → sets name + password
5. Account created → role + warehouse_number assigned automatically
6. Token deleted after use (single-use)
```

Same flow for Warehouse Manager → Dispatcher invitation.

**Invite token:** UUID, expires in 7 days, single-use, email-locked (only the invited email can use it).

### Credential Storage

ERP credentials are **never stored in the database**. They are stored in **GCP Secret Manager**:

```
Secret path: nexera/{tenant_id}/conn/{connection_id}
Value: JSON blob with auth fields (api_key, username/password, client_id/secret)
```

Database stores only the secret path reference.

---

## 8. Screen Flow

### Public / Unauthenticated
```
Landing Page → Company Signup → Pick Plan → Email + Password login → IT Admin Dashboard
```

### IT Admin Flow
```
Admin Dashboard → Add Connection (4-step wizard) → Discover Warehouses → Assign WH Manager
```

### Warehouse Manager Flow
```
Login → Select Warehouse Number → Warehouse Profile Setup (first login only)
  → WH Dashboard → Team Settings → Invite Dispatchers
```

**Warehouse Profile Setup (first login):**
- Physical address (street, city, country, postal code)
- Latitude + longitude (Google Maps pin picker or manual entry)
- Working hours (start time, end time)
- Working days (Mon–Fri / Mon–Sat / 7 days — multi-select)
- This data is used as the `from` address on all route calculations and driver QR pages
- MonitorAgent respects working hours — no alerts sent outside operating hours

### Dispatcher Daily Flow
```
Login → Select Warehouse Number → Dashboard (KPIs + alerts) → Delivery List → Delivery Detail → Assign Driver → Generate QR
AI Chat floating button available on all dispatcher screens
```

### Driver Flow (no login)
```
Scan QR → Public delivery page → See pickup + items + destination → Mark delivered / raise issue
```

---

## 9. Add ERP Connection Wizard (4 Steps)

### Step 1 — ERP System
- Connection name (friendly label)
- ERP system dropdown (SAP S/4HANA live, others Coming Soon)
- Base URL field
- Sidebar: help text for each ERP type

### Step 2 — Auth Type
- Auth options filtered by selected ERP
- SAP S/4HANA options: API Key / Basic Auth / OAuth 2.0
- Sidebar: which auth type for which SAP setup

### Step 3 — Credentials
- Form fields change based on auth type selected
- **API Key:** single field — API key header value
- **Basic Auth:** username + password
- **OAuth 2.0:** token URL + client ID + client secret + optional scope
- Live connection test on submit — 4 checks shown:
  1. Authentication successful
  2. OData metadata reachable
  3. OutboundDelivery entity accessible
  4. Warehouse numbers discovered
- Credentials saved to GCP Secret Manager on success

### Step 4 — Warehouses
- Auto-discovered warehouse numbers listed from ERP
- IT Admin assigns Warehouse Manager email per warehouse number
- Manager assignment optional — can be done later
- Save → invite links generated for assigned managers

---

## 10. Dispatcher Dashboard

### Layout: Top Nav + Content

```
[Logo] [NeXera] | [WH-0001 · Hamburg North] | Dashboard · Deliveries · Drivers    [Ask AI 🤖] [Avatar]
─────────────────────────────────────────────────────────────────────────────────────────────────────
[Alert banner: 3 delayed deliveries unassigned > 30 min]
[KPI: Open 142] [KPI: In Transit 89] [KPI: Delayed 12 ⚠] [KPI: Delivered 48 ✓]
─────────────────────────────────────────────────────────────────────────────────────────────────────
[Search...] [Status ▾] [System ▾] [Date ▾]
[Delivery table: No. | Ship-To | System | Status | Date | Driver | Action]
```

### Delivery Detail Panel
- Delivery header: document number, status badge, ERP + warehouse label
- Delivery info grid: ship-to name, address, **email, mobile**, type, planned date, shipping point, route, weight
- Customer contact visible for dispatcher to trigger manual alert if needed
- Items table: item number, material, quantity, unit
- Driver assignment: name + mobile → Assign button
- QR code box: generated after assignment, share via copy/WhatsApp/print
- Route panel: Google Maps route from **warehouse coordinates** → ship-to address, distance + ETA
- Timeline: SAP status history with timestamps

### AI Chat Floating Panel
- Triggered by "Ask AI" button in top nav
- Floats over current page (does not navigate away)
- Scoped to current warehouse number — cannot query other warehouses
- Shows tool calls inline as they execute (streaming)
- Renders delivery cards inline in chat responses
- QR share actions available directly in chat

---

## 11. AI Agent Architecture

### Stack
- **Framework:** LangGraph (supervisor + 3 subagents)
- **LLM:** Gemini 2.5 Flash via Vertex AI (us-central1)
- **Hosting:** Cloud Run (Python/FastAPI)
- **Tracing:** Vertex AI tracing enabled

### Agent Graph
```
UserMessage → parse_input → classify (Gemini) → route
                                                   ├── DeliveryAgent  (view, filter, status)
                                                   ├── DriverAgent    (assign, generate QR)
                                                   └── RouteAgent     (directions, ETA)

Background: MonitorAgent (APScheduler → Teams webhook alerts)
```

### Tenant + Warehouse Scoping
Every tool call receives `tenant_id` and `warehouse_number` from the session JWT. Agents cannot cross tenant or warehouse boundaries.

### Tool Inventory

| Agent | Tools |
|---|---|
| DeliveryAgent | `get_deliveries`, `get_delivery_detail`, `get_delivery_items`, `filter_by_status` |
| DriverAgent | `assign_driver`, `generate_qr`, `get_driver_deliveries` |
| RouteAgent | `get_route_directions` (from: warehouse lat/lng → to: ship_to_address), `get_eta`, `get_shipping_point` |
| MonitorAgent | `check_unassigned`, `check_idle_drivers`, `send_teams_alert`, `send_customer_alert` (email/SMS to ship-to contact) |

---

## 12. Data Model

### Core Tables

```sql
tenants
  id, name, domain, plan_type, created_at

users
  id, tenant_id, email, password_hash, full_name, role, created_at

invites
  id, tenant_id, email, role, warehouse_number, token, expires_at, used_at

connections
  id, tenant_id, name, erp_type, auth_type, base_url, secret_ref, status, created_at

warehouses
  id, tenant_id, connection_id, warehouse_number, name,
  physical_address, city, country, postal_code,
  latitude, longitude,
  working_hours_start, working_hours_end,
  working_days,
  manager_user_id, created_at

user_warehouses
  user_id, warehouse_number, tenant_id, role

deliveries
  id, tenant_id, connection_id, warehouse_number, delivery_id,
  source_erp, status, planned_gi_date, ship_to_name, ship_to_address,
  ship_to_email, ship_to_mobile,
  shipping_point, route, weight_kg, driver_name, driver_mobile,
  qr_token, synced_at, created_at

delivery_items
  id, delivery_id, item_no, material, qty, unit

tenant_usage
  tenant_id, month, delivery_count, connection_count
```

---

## 13. GCP Infrastructure

| Service | Role |
|---|---|
| Cloud Run (×2) | `cap-srv` (Node.js/CAP OData backend) + `agents` (Python/LangGraph) |
| Cloud Run (×1) | `frontend` (Next.js — new) |
| Cloud Run Job | `cap-srv-migrate` (one-shot DB schema migration) |
| Cloud SQL (PostgreSQL) | All application data — tenant-isolated by `tenant_id` |
| Vertex AI | Gemini 2.5 Flash — LLM for all agents + tracing |
| Artifact Registry | Docker images for all services |
| Cloud Build | CI/CD — builds images on push |
| Secret Manager | ERP credentials — one secret per connection |
| Google Maps Platform | Route directions + ETA for deliveries |

### GCP Project
- **Project ID:** `agentic-dispatch`
- **Region:** `us-central1`

---

## 14. Frontend Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Framework | Next.js 14 (App Router) | React-based, full-stack, Cloud Run ready |
| Styling | Tailwind CSS | Utility-first, fast to build |
| Components | shadcn/ui | Polished dark-mode components out of box |
| AI Streaming | Vercel AI SDK | Built for LLM streaming + tool call rendering |
| Auth | JWT (custom) | Simple for hackathon — email+password |
| Charts | Recharts | Delivery KPI visualisations |
| Hosting | Cloud Run (port 8080) | Same infra as backend services |

---

## 15. Screen Inventory

| Screen | Role | Status |
|---|---|---|
| Landing page | Public | New |
| Pricing page (1PL + 3PL messaging) | Public | New |
| Company signup | Public | New |
| Login | All users | New |
| IT Admin dashboard | IT Admin | New |
| Add ERP connection wizard | IT Admin | New |
| Warehouse list + manager assign | IT Admin | New |
| WH Manager dashboard | WH Manager | New |
| Warehouse profile setup (address, hours, coordinates) | WH Manager | New |
| Team settings (invite dispatchers) | WH Manager | New |
| Dispatcher dashboard | Dispatcher | New |
| Delivery list | Dispatcher | Replaces Fiori |
| Delivery detail + driver assign + QR | Dispatcher | Replaces Fiori |
| AI chat panel (floating) | Dispatcher | New |
| Driver QR public page | Driver (no login) | New (stub) |
| Plan + usage page | IT Admin | New (stub) |

---

## 16. Hackathon Build Scope

### Build fully
- Company signup + login + invite flow
- Add ERP Connection wizard (SAP S/4HANA + API Key auth)
- Warehouse discovery + manager assignment
- Warehouse profile setup (address, working hours, lat/lng for route origin)
- WH Manager team settings (invite dispatchers)
- Dispatcher dashboard + delivery list + delivery detail
- Driver assignment + QR code generation
- AI chat floating panel (streaming, tool-call visible)
- Vertex AI tracing enabled

### Stub / demo only
- Pricing page (cards shown, no Stripe)
- Driver QR public page (static page, no real GPS)
- Odoo / Oracle connectors (dropdown visible, Coming Soon)
- Email sending (invite link shown on screen, shared manually)
- Multi-company signup (one demo tenant)
- Role enforcement (show concept, not fully enforced)

### Not in scope
- Stripe billing integration
- Real email server
- Password reset flow
- Mobile-responsive design
- Per-warehouse admin enforcement

---

## 17. Onboarding Documentation Outline

This spec serves as the source of truth for the product website and onboarding docs. Sections map as follows:

| Spec Section | Website / Docs Use |
|---|---|
| §1 Product Vision | Hero copy + About page |
| §2 Business Model | Pricing page |
| §4 Role Hierarchy | Onboarding guide: "Who does what" |
| §6 ERP Connectors | Integrations page: supported ERPs |
| §7 Auth & Identity | Security page + IT Admin setup guide |
| §9 Add Connection Wizard | IT Admin onboarding walkthrough |
| §10 Dispatcher Dashboard | Dispatcher onboarding guide |
| §11 AI Agent | Product feature page: "How NeXera AI works" |
| §13 GCP Infrastructure | Technical architecture page (for enterprise buyers) |

---

## 18. Open Questions (Post-Hackathon)

1. **Auth types per ERP** — validate Basic Auth and OAuth 2.0 against real SAP systems (not just sandbox API Key)
2. **Odoo connector** — REST JSON vs XML-RPC, field mapping for `stock.picking` → universal delivery schema
3. **Driver QR page** — real GPS tracking? photo proof of delivery? signature capture?
4. **Stripe integration** — usage metering webhooks, plan enforcement on API
5. **Email server** — SendGrid or Firebase for real invite emails
6. **Data residency** — EU tenants may require Cloud SQL in eu-central1
7. **Warehouse sync frequency** — 5 min polling vs SAP event-driven (BTP Event Mesh)
8. **Customer alerts channel** — email (SendGrid) vs SMS (Twilio) vs WhatsApp Business API for ship-to contact notifications on delays
