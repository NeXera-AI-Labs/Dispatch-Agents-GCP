# cap-srv — GCP Cloud Run Deployment

## Prerequisites

- GCP project `agentic-dispatch` with APIs enabled
- Cloud SQL instance `nexera-sbx-db` with database `dispatch` and user `dispatch-user`
- Secrets in Secret Manager: `DB_PASSWORD`, `SAP_SANDBOX_API_KEY`, `GOOGLE_MAPS_API_KEY`
- IAM roles granted (see design doc Step 6)

## Deploy

```bash
gcloud run deploy cap-srv --source . --region us-central1 --allow-unauthenticated --add-cloudsql-instances agentic-dispatch:us-central1:nexera-sbx-db --set-env-vars "NODE_ENV=production,CDS_REQUIRES_DB_CREDENTIALS_PASSWORD=<password>" --set-secrets "SAP_SANDBOX_API_KEY=SAP_SANDBOX_API_KEY:latest,GOOGLE_MAPS_API_KEY=GOOGLE_MAPS_API_KEY:latest" --project agentic-dispatch
```

## Schema Migration

`cds deploy --to postgres` does not work reliably with `@sap/cds@9`. Use `migrate.js` instead:

```bash
# Build migration image
gcloud builds submit --config cloudbuild-migrate.yaml --project agentic-dispatch

# Update and run job
gcloud run jobs update cap-srv-migrate --image us-central1-docker.pkg.dev/agentic-dispatch/cloud-run-source-deploy/cap-srv-migrate:latest --region us-central1 --set-cloudsql-instances agentic-dispatch:us-central1:nexera-sbx-db --set-env-vars "NODE_ENV=production,CDS_REQUIRES_DB_CREDENTIALS_PASSWORD=<password>" --project agentic-dispatch

gcloud run jobs execute cap-srv-migrate --region us-central1 --wait --project agentic-dispatch
```

## Verify

```bash
# Service root
curl https://cap-srv-1069189829983.us-central1.run.app/odata/v4/gmaps/
curl https://cap-srv-1069189829983.us-central1.run.app/odata/v4/ewm/
curl https://cap-srv-1069189829983.us-central1.run.app/odata/v4/tracking/

# Data query
curl "https://cap-srv-1069189829983.us-central1.run.app/odata/v4/ewm/OutboundDeliveries?\$top=1"
curl "https://cap-srv-1069189829983.us-central1.run.app/odata/v4/tracking/Driver"
```

## Key Config

| File | Purpose |
|------|---------|
| `package.json` | CDS config: `[production]` profile uses postgres, dummy auth, `locale_fallback: true` |
| `Dockerfile` | Cloud Run image: node:20-slim, `npm install --omit=dev --legacy-peer-deps` |
| `Dockerfile.migrate` | Migration image: runs `migrate.js` |
| `migrate.js` | Generates DDL via `cds compile --to sql --dialect postgres`, executes via `pg` client |
| `cloudbuild-migrate.yaml` | Cloud Build config for migration image |
| `.cdsrc.json` | Currently empty — credentials come from env vars |

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `orderByICU — Cannot read properties of undefined` | Missing `locale_fallback` | Add `"features": { "locale_fallback": true }` to cds config |
| `ECONNREFUSED 127.0.0.1:5432` | Cloud SQL Auth Proxy uses Unix socket | Set host to `/cloudsql/agentic-dispatch:us-central1:nexera-sbx-db` |
| `relation "xxx" does not exist` | Schema not deployed | Run migration job |
| `cds deploy` says success but 0 tables | Known bug with @sap/cds@9 | Use `migrate.js` instead |
| ERESOLVE peer dep conflict | @cap-js/postgres vs @sap/cds@9 | Use `--legacy-peer-deps` |
| SAP API returns 401 | Missing API key | Mount `SAP_SANDBOX_API_KEY` secret on Cloud Run |

## Local Development

```bash
# Uses SQLite (default profile)
cds watch
```

Local dev uses SQLite, not PostgreSQL. The `[production]` profile (activated by `NODE_ENV=production`) switches to PostgreSQL on Cloud Run.
