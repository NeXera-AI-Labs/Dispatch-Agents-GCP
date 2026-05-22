# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

LangGraph multi-agent system for ERP outbound delivery dispatch. A supervisor classifies user messages and routes to specialized ReAct subagents (delivery, driver, route), each backed by OData tools against a CAP backend on Cloud Run. A background MonitorAgent polls for overdue deliveries and posts alerts to Teams. LLM is Gemini 2.5 Flash via Vertex AI.

## Commands

```bash
# Local dev — FastAPI server with web chat UI
PYTHONPATH=. uvicorn main:app --reload

# Local dev — LangGraph Studio (interactive graph UI)
PYTHONPATH=. langgraph dev --host 127.0.0.1 --port 2024

# Tests
PYTHONPATH=. python -m pytest tests/ -v

# Health check
curl http://localhost:8000/health

# Deploy to Cloud Run (via Cloud Build)
gcloud builds submit --config cloudbuild.yaml
```

## Environment Variables

Local: `.env` file. Cloud Run: Secret Manager + env vars in Cloud Run service config.

| Variable | Description |
|---|---|
| `GOOGLE_PROJECT_ID` | GCP project ID (`agentic-dispatch`) |
| `VERTEX_LOCATION` | Vertex AI region (`us-central1`) |
| `VERTEX_MODEL` | Gemini model (`gemini-2.5-flash`) |
| `CAP_BASE_URL` | Cloud Run URL for the CAP backend |
| `TEAMS_WEBHOOK_URL` | Teams incoming webhook for alerts |
| `LANGCHAIN_API_KEY` | LangSmith tracing (optional) |
| `LANGCHAIN_TRACING_V2` | Enable LangSmith tracing (`true`/`false`) |

## Architecture

```
UserInput.message → parse_input → classify (LLM) → route_message
                                                      ├── DeliveryAgent (4 read tools)
                                                      ├── DriverAgent (6 tools, HiTL interrupt)
                                                      └── RouteAgent (3 read tools)

Background: MonitorAgent (APScheduler → Teams webhook)
```

### Graph Input Schema

The supervisor uses `StateGraph(SupervisorState, input=UserInput)` where `UserInput` only has `message: str`. When invoking the graph programmatically, pass `{"message": "..."}` — NOT `{"messages": [HumanMessage(...)]}`. The `messages` field gets silently dropped if passed directly because it's not in `UserInput`. The `parse_input` node converts `message` → `messages`.

### Classification Pollution

The `classify` node appends an AIMessage (e.g., "delivery") to state. Subagent runner functions filter to only human messages via `_user_messages()` before invoking subagents, so the classification word doesn't confuse them.

### Two Entry Points, Same Graph

- **LangGraph Studio**: loads via `langgraph.json` → `./agents/supervisor.py:graph` (Studio provides its own checkpointer)
- **FastAPI**: `main.py` imports `graph`, copies it, attaches `MemorySaver` for thread-based conversation memory

### OData Auth Flow

All tools → `ODataClient` → direct HTTP calls to CAP OData V4 on Cloud Run. CAP is deployed as a public Cloud Run service (no XSUAA — auth is handled at the Next.js frontend layer via JWT).

## Cloud Run Deployment

The `Dockerfile` builds a Python 3.11-slim image. Deploy via Cloud Build (`cloudbuild.yaml`). Service config (env vars, Cloud SQL connection) is managed in Cloud Run service definition. The service does NOT need a Cloud SQL socket — it calls the CAP backend over HTTPS.

## Key Patterns

- **Tool error handling**: Every `@tool` function wraps external calls in try/except and returns a string error message — never raises.
- **Driver auto-creation**: CAP's `assignDriver` action auto-creates drivers if the mobile number is new. Direct POST to `Driver` entity is blocked (`@readonly`).
- **Vertex AI LLM**: `ChatVertexAI` from `langchain_google_vertexai` in `ai_core.py`. Uses ADC (Application Default Credentials) — no API key needed on Cloud Run.
- **Config**: All env vars loaded via `pydantic-settings` in `config.py`. Local: `.env` file. Cloud Run: Secret Manager + service env vars.
- **Multi-tenant awareness**: Future — agents will receive `tenant_id` and `warehouse_id` from the JWT context passed in the `/chat` request body.

## Local Dev Prerequisite
- Run `gcloud auth application-default login` before first `/chat` call — `/health` passes without ADC but inference fails.
