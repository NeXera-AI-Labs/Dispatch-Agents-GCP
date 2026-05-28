CREATE TABLE IF NOT EXISTS tenants (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(200) NOT NULL,
  domain        VARCHAR(200),
  plan_type     VARCHAR(20) DEFAULT 'trial',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id),
  email         VARCHAR(200) NOT NULL UNIQUE,
  password_hash VARCHAR(200) NOT NULL,
  full_name     VARCHAR(200),
  role          VARCHAR(20) NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invites (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id),
  email            VARCHAR(200) NOT NULL,
  role             VARCHAR(20) NOT NULL,
  warehouse_number VARCHAR(20),
  token            VARCHAR(100) NOT NULL UNIQUE,
  expires_at       TIMESTAMPTZ NOT NULL,
  used_at          TIMESTAMPTZ,
  created_by       UUID REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS connections (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id),
  name        VARCHAR(200) NOT NULL,
  erp_type    VARCHAR(50) NOT NULL,
  auth_type   VARCHAR(50) NOT NULL,
  base_url    VARCHAR(500) NOT NULL,
  secret_ref  VARCHAR(500),
  status      VARCHAR(20) DEFAULT 'active',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS warehouses (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            UUID NOT NULL REFERENCES tenants(id),
  connection_id        UUID NOT NULL REFERENCES connections(id),
  warehouse_number     VARCHAR(20) NOT NULL,
  name                 VARCHAR(200),
  physical_address     VARCHAR(500),
  city                 VARCHAR(100),
  country              VARCHAR(100),
  postal_code          VARCHAR(20),
  latitude             DOUBLE PRECISION,
  longitude            DOUBLE PRECISION,
  working_hours_start  VARCHAR(10),
  working_hours_end    VARCHAR(10),
  working_days         VARCHAR(50),
  manager_user_id      UUID REFERENCES users(id),
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_warehouses (
  user_id          UUID NOT NULL REFERENCES users(id),
  warehouse_number VARCHAR(20) NOT NULL,
  tenant_id        UUID NOT NULL REFERENCES tenants(id),
  role             VARCHAR(20) NOT NULL,
  PRIMARY KEY (user_id, warehouse_number, tenant_id)
);

CREATE TABLE IF NOT EXISTS tenant_settings (
  tenant_id          UUID PRIMARY KEY REFERENCES tenants(id),
  gemini_api_key     VARCHAR(500),
  teams_webhook_url  VARCHAR(1000),
  google_maps_key    VARCHAR(500),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS deliveries (
  tenant_id              UUID NOT NULL REFERENCES tenants(id),
  delivery_document      VARCHAR(10) NOT NULL,
  ship_to_party          VARCHAR(10),
  shipping_point         VARCHAR(4),
  delivery_date          DATE,
  actual_delivery_route  VARCHAR(6),
  header_gross_weight    NUMERIC(15,3),
  header_net_weight      NUMERIC(15,3),
  hdr_goods_mvt_status   VARCHAR(1),
  raw_json               JSONB NOT NULL,
  imported_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tenant_id, delivery_document)
);

CREATE INDEX IF NOT EXISTS deliveries_tenant_date_idx
  ON deliveries(tenant_id, delivery_date DESC);

CREATE TABLE IF NOT EXISTS delivery_items (
  tenant_id                 UUID NOT NULL,
  delivery_document         VARCHAR(10) NOT NULL,
  delivery_document_item    VARCHAR(6) NOT NULL,
  material                  VARCHAR(40),
  actual_delivery_quantity  NUMERIC(15,3),
  delivery_quantity_unit    VARCHAR(3),
  storage_location          VARCHAR(4),
  raw_json                  JSONB NOT NULL,
  imported_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tenant_id, delivery_document, delivery_document_item),
  FOREIGN KEY (tenant_id, delivery_document)
    REFERENCES deliveries(tenant_id, delivery_document) ON DELETE CASCADE
);
