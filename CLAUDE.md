# CLAUDE.md — NeXera Dispatch

## Structure
- `agents/` — LangGraph + FastAPI (Vertex AI / Gemini 2.5 Flash). See `agents/CLAUDE.md`.
- `cap-srv/` — SAP CAP OData V4 backend, deployed on Cloud Run (public, no XSUAA).
- `frontend/nexera-dispatch/` — Next.js 14 App Router, Tailwind, dark slate/indigo theme.

## Local Dev
```bash
# Agents (port 8000) — requires agents/.env (template: agents/.env.example)
cd agents && PYTHONPATH=. uvicorn main:app --reload

# Frontend (port 3000)
cd frontend/nexera-dispatch && npm run dev

# cap-srv is already on Cloud Run — no local start needed
# URL: https://cap-srv-1069189829983.us-central1.run.app
```

## Frontend Gotchas
- `getCurrentUser()` / `getToken()` read localStorage — **always call inside `useEffect`**, never at component body/render level (SSR hydration crash).
- cap-srv: all browser calls go via `/api/cap/[...path]` Next.js proxy (CORS). Never fetch cap-srv directly from the browser.
- Agents chat: goes via `/api/agents/chat` proxy. Use `AGENTS_URL` (server-side), not `NEXT_PUBLIC_AGENTS_URL`.
- SAP OData fields are PascalCase: `DeliveryDocument`, `ShipToParty`, `HdrGoodsMvtIncompletionStatus`, `DeliveryDate`, etc.
- `getDeliveryItems` is a CDS action (POST to `/odata/v4/ewm/getDeliveryItems`) — no `OutboundDeliveryItems` entity exists.
- `OutboundDeliveries` has no `WarehouseNumber` field in the SAP sandbox — do not filter by it.

## Agents Gotchas
- Vertex AI requires ADC locally: `gcloud auth application-default login`. Cloud Run uses service account automatically.
- Health check (`/health`) passes without ADC — inference fails at first `/chat` call without it.
