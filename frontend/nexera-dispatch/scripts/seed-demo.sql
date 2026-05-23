-- Demo seed for hackathon walkthrough.
-- Idempotent: safe to re-run. Creates Acme Logistics tenant with 3 users,
-- 1 warehouse, and 1 SAP S/4HANA Sandbox connection.
-- Login: admin@acme.demo / supervisor@acme.demo / dispatcher@acme.demo
-- Password (all three): Demo@2026

-- Fixed UUIDs so re-runs land on the same rows.
\set tenant_id      '''11111111-1111-1111-1111-111111111111'''
\set admin_id       '''22222222-2222-2222-2222-222222222221'''
\set supervisor_id  '''22222222-2222-2222-2222-222222222222'''
\set dispatcher_id  '''22222222-2222-2222-2222-222222222223'''
\set connection_id  '''33333333-3333-3333-3333-333333333333'''
\set warehouse_id   '''44444444-4444-4444-4444-444444444444'''

-- bcrypt hash of 'Demo@2026' (cost=10), generated with bcryptjs to match lib/auth-helpers.ts
\set pw_hash        '''$2b$10$QVydPvwbcaJisdxH0OM7dOu2/nH6URbXOGnqDHNWJkiZO825OZJAW'''

INSERT INTO tenants (id, name, domain, plan_type)
VALUES (:tenant_id, 'Acme Logistics', 'acme.demo', 'demo')
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (id, tenant_id, email, password_hash, full_name, role) VALUES
  (:admin_id,      :tenant_id, 'admin@acme.demo',      :pw_hash, 'Alex Admin',       'it_admin'),
  (:supervisor_id, :tenant_id, 'supervisor@acme.demo', :pw_hash, 'Sam Supervisor',   'supervisor'),
  (:dispatcher_id, :tenant_id, 'dispatcher@acme.demo', :pw_hash, 'Dana Dispatcher',  'dispatcher')
ON CONFLICT (email) DO NOTHING;

INSERT INTO connections (id, tenant_id, name, erp_type, auth_type, base_url, secret_ref, status)
VALUES (
  :connection_id,
  :tenant_id,
  'SAP S/4HANA Sandbox',
  'SAP_S4HANA',
  'api_key',
  'https://sandbox.api.sap.com/s4hanacloud',
  'demo://preseeded',
  'active'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO warehouses (
  id, tenant_id, connection_id, warehouse_number, name,
  physical_address, city, country, postal_code,
  latitude, longitude,
  working_hours_start, working_hours_end, working_days,
  manager_user_id
) VALUES (
  :warehouse_id,
  :tenant_id,
  :connection_id,
  '1710',
  'Frankfurt Distribution Center',
  'Hanauer Landstrasse 291',
  'Frankfurt am Main',
  'Germany',
  '60314',
  50.1213, 8.7299,
  '08:00', '18:00', 'Mon-Fri',
  :supervisor_id
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO user_warehouses (user_id, warehouse_number, tenant_id, role) VALUES
  (:supervisor_id, '1710', :tenant_id, 'supervisor'),
  (:dispatcher_id, '1710', :tenant_id, 'dispatcher')
ON CONFLICT (user_id, warehouse_number, tenant_id) DO NOTHING;

-- tenant_settings holds tenant-scoped integrations.
-- google_maps_key / teams_webhook_url are passed in via -v from the seed runner,
-- which sources them from Secret Manager. Re-seeds overwrite with the latest values.
-- Gemini auth uses ADC (the agents service account has roles/aiplatform.user) — no key here.
INSERT INTO tenant_settings (tenant_id, google_maps_key, teams_webhook_url, updated_at)
VALUES (
  :tenant_id,
  NULLIF(:'google_maps_key', ''),
  NULLIF(:'teams_webhook_url', ''),
  NOW()
)
ON CONFLICT (tenant_id) DO UPDATE SET
  google_maps_key   = COALESCE(EXCLUDED.google_maps_key,   tenant_settings.google_maps_key),
  teams_webhook_url = COALESCE(EXCLUDED.teams_webhook_url, tenant_settings.teams_webhook_url),
  updated_at        = NOW();

\echo 'Seed complete: Acme Logistics demo tenant ready.'
\echo '  admin@acme.demo / supervisor@acme.demo / dispatcher@acme.demo'
\echo '  Password: Demo@2026'
