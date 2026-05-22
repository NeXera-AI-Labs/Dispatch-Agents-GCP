# Plan 1: DB Schema + Auth API (Next.js API Routes)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the NeXera multi-tenant PostgreSQL schema and expose auth/connections endpoints as Next.js API routes — no SAP CAP/CDS involved. cap-srv remains a pure SAP OData proxy.

**Architecture:** Next.js App Router API routes (`app/api/...`) connect directly to Cloud SQL PostgreSQL using the `pg` npm package. Passwords hashed with `bcryptjs`, sessions via JWT (`jsonwebtoken`). DB schema is plain SQL, applied via a migration script. ERP credentials stored in GCP Secret Manager — never in the DB.

**Tech Stack:** Next.js 14 API routes, `pg`, `bcryptjs`, `jsonwebtoken`, `@google-cloud/secret-manager`, plain SQL migrations.

**cap-srv role (unchanged):** SAP OData proxy only — `ewm_srv.js`, `tracking_srv.js`, `gmap_srv.js` stay as-is. No CDS schema changes.

---

## File Map

```
frontend/nexera-dispatch/
├── lib/
│   ├── db.ts                          pg Pool singleton
│   └── auth-helpers.ts                JWT sign/verify, password hash helpers
├── app/api/
│   ├── auth/
│   │   ├── signup/route.ts
│   │   ├── login/route.ts
│   │   ├── invite/create/route.ts
│   │   ├── invite/get/route.ts
│   │   ├── invite/accept/route.ts
│   │   └── me/route.ts
│   └── connections/
│       ├── route.ts                   GET list, POST save
│       └── [id]/
│           ├── test/route.ts
│           └── assign-manager/route.ts
└── scripts/
    └── migrate.sql                    Plain SQL — CREATE TABLE IF NOT EXISTS
```

---

## Task 1: Install dependencies

**Files:**
- Modify: `frontend/nexera-dispatch/package.json`

- [ ] **Step 1: Install pg, bcryptjs, jsonwebtoken, Secret Manager**

```bash
cd frontend/nexera-dispatch
npm install pg bcryptjs jsonwebtoken @google-cloud/secret-manager
npm install --save-dev @types/pg @types/bcryptjs @types/jsonwebtoken
```

Expected: packages added to package.json.

- [ ] **Step 2: Commit**

```bash
cd ../..
git add frontend/nexera-dispatch/package.json frontend/nexera-dispatch/package-lock.json
git commit -m "feat: add pg, bcryptjs, jsonwebtoken, secret-manager to frontend"
```

---

## Task 2: DB helpers — pg pool + auth utilities

**Files:**
- Create: `frontend/nexera-dispatch/lib/db.ts`
- Create: `frontend/nexera-dispatch/lib/auth-helpers.ts`

- [ ] **Step 1: Create db.ts — pg Pool singleton**

File: `frontend/nexera-dispatch/lib/db.ts`

```typescript
import { Pool } from 'pg';

let pool: Pool;

export function getDb(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 10,
    });
  }
  return pool;
}
```

- [ ] **Step 2: Create auth-helpers.ts**

File: `frontend/nexera-dispatch/lib/auth-helpers.ts`

```typescript
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRY = '8h';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: {
  user_id: string;
  tenant_id: string;
  email: string;
  role: string;
  warehouse_numbers: string[];
}): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

export function verifyToken(token: string): {
  user_id: string;
  tenant_id: string;
  email: string;
  role: string;
  warehouse_numbers: string[];
} | null {
  try {
    return jwt.verify(token, JWT_SECRET) as ReturnType<typeof verifyToken>;
  } catch {
    return null;
  }
}

export function getTokenFromRequest(request: Request): ReturnType<typeof verifyToken> {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return verifyToken(auth.slice(7));
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/nexera-dispatch/lib/db.ts frontend/nexera-dispatch/lib/auth-helpers.ts
git commit -m "feat: add pg pool singleton and JWT/bcrypt auth helpers"
```

---

## Task 3: SQL migration script

**Files:**
- Create: `frontend/nexera-dispatch/scripts/migrate.sql`

- [ ] **Step 1: Create migrate.sql**

File: `frontend/nexera-dispatch/scripts/migrate.sql`

```sql
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
```

- [ ] **Step 2: Run migration against local Postgres (for local dev)**

For local dev, you need a local Postgres running. The easiest way — run Postgres in Docker:

```bash
docker run -d --name nexera-pg \
  -e POSTGRES_DB=nexera \
  -e POSTGRES_USER=nexera \
  -e POSTGRES_PASSWORD=nexera \
  -p 5432:5432 \
  postgres:16
```

Set env in `.env.local`:
```
DATABASE_URL=postgresql://nexera:nexera@localhost:5432/nexera
JWT_SECRET=nexera-local-dev-secret
NEXT_PUBLIC_CAP_URL=https://cap-srv-1069189829983.us-central1.run.app
NEXT_PUBLIC_AGENTS_URL=https://agents-YOUR_HASH.us-central1.run.app
```

Run migration:
```bash
cd frontend/nexera-dispatch
PGPASSWORD=nexera psql -h localhost -U nexera -d nexera -f scripts/migrate.sql
```

Expected: `CREATE TABLE` lines with no errors.

- [ ] **Step 3: Commit**

```bash
cd ../..
git add frontend/nexera-dispatch/scripts/migrate.sql
git commit -m "feat: add plain SQL migration for nexera multi-tenant schema"
```

---

## Task 4: Auth API routes

**Files:**
- Create: `frontend/nexera-dispatch/app/api/auth/signup/route.ts`
- Create: `frontend/nexera-dispatch/app/api/auth/login/route.ts`
- Create: `frontend/nexera-dispatch/app/api/auth/invite/create/route.ts`
- Create: `frontend/nexera-dispatch/app/api/auth/invite/get/route.ts`
- Create: `frontend/nexera-dispatch/app/api/auth/invite/accept/route.ts`
- Create: `frontend/nexera-dispatch/app/api/auth/me/route.ts`

- [ ] **Step 1: Create signup route**

File: `frontend/nexera-dispatch/app/api/auth/signup/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { hashPassword, signToken } from '@/lib/auth-helpers';

export async function POST(request: Request) {
  const { company_name, email, password, full_name } = await request.json();
  if (!company_name || !email || !password) {
    return NextResponse.json({ error: 'company_name, email and password required' }, { status: 400 });
  }

  const db = getDb();
  const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length > 0) {
    return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
  }

  const tenantRes = await db.query(
    'INSERT INTO tenants (name, plan_type) VALUES ($1, $2) RETURNING id',
    [company_name, 'trial']
  );
  const tenantId = tenantRes.rows[0].id;

  const hash = await hashPassword(password);
  const userRes = await db.query(
    'INSERT INTO users (tenant_id, email, password_hash, full_name, role) VALUES ($1,$2,$3,$4,$5) RETURNING id',
    [tenantId, email, hash, full_name || email, 'it_admin']
  );
  const userId = userRes.rows[0].id;

  const token = signToken({ user_id: userId, tenant_id: tenantId, email, role: 'it_admin', warehouse_numbers: [] });
  return NextResponse.json({ token, tenant_id: tenantId, user_id: userId, role: 'it_admin' });
}
```

- [ ] **Step 2: Create login route**

File: `frontend/nexera-dispatch/app/api/auth/login/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyPassword, signToken } from '@/lib/auth-helpers';

export async function POST(request: Request) {
  const { email, password } = await request.json();
  if (!email || !password) {
    return NextResponse.json({ error: 'email and password required' }, { status: 400 });
  }

  const db = getDb();
  const res = await db.query('SELECT * FROM users WHERE email = $1', [email]);
  const user = res.rows[0];
  if (!user) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });

  const match = await verifyPassword(password, user.password_hash);
  if (!match) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });

  const whRes = await db.query(
    'SELECT warehouse_number FROM user_warehouses WHERE user_id = $1 AND tenant_id = $2',
    [user.id, user.tenant_id]
  );
  const warehouse_numbers = whRes.rows.map((r: { warehouse_number: string }) => r.warehouse_number);

  const token = signToken({ user_id: user.id, tenant_id: user.tenant_id, email: user.email, role: user.role, warehouse_numbers });
  return NextResponse.json({ token, tenant_id: user.tenant_id, user_id: user.id, role: user.role, warehouse_numbers });
}
```

- [ ] **Step 3: Create invite/create route**

File: `frontend/nexera-dispatch/app/api/auth/invite/create/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getDb } from '@/lib/db';
import { getTokenFromRequest } from '@/lib/auth-helpers';

const APP_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function POST(request: Request) {
  const caller = getTokenFromRequest(request);
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { email, role, warehouse_number } = await request.json();
  if (!email || !role) return NextResponse.json({ error: 'email and role required' }, { status: 400 });

  const allowed: Record<string, string[]> = { it_admin: ['wh_manager'], wh_manager: ['dispatcher', 'supervisor'] };
  if (!allowed[caller.role]?.includes(role)) {
    return NextResponse.json({ error: `${caller.role} cannot invite ${role}` }, { status: 403 });
  }

  const token = randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 86400000).toISOString();

  const db = getDb();
  await db.query(
    'INSERT INTO invites (tenant_id, email, role, warehouse_number, token, expires_at, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7)',
    [caller.tenant_id, email, role, warehouse_number || null, token, expiresAt, caller.user_id]
  );

  return NextResponse.json({ invite_url: `${APP_BASE_URL}/invite?token=${token}`, token });
}
```

- [ ] **Step 4: Create invite/get route**

File: `frontend/nexera-dispatch/app/api/auth/invite/get/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(request: Request) {
  const { token } = await request.json();
  const db = getDb();
  const res = await db.query('SELECT * FROM invites WHERE token = $1', [token]);
  const invite = res.rows[0];

  if (!invite) return NextResponse.json({ valid: false, email: '', role: '', warehouse_number: '', tenant_id: '' });
  if (invite.used_at) return NextResponse.json({ valid: false, email: invite.email, role: '', warehouse_number: '', tenant_id: '' });
  if (new Date(invite.expires_at) < new Date()) return NextResponse.json({ valid: false, email: invite.email, role: '', warehouse_number: '', tenant_id: '' });

  return NextResponse.json({
    valid: true,
    email: invite.email,
    role: invite.role,
    warehouse_number: invite.warehouse_number || '',
    tenant_id: invite.tenant_id,
  });
}
```

- [ ] **Step 5: Create invite/accept route**

File: `frontend/nexera-dispatch/app/api/auth/invite/accept/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { hashPassword, signToken } from '@/lib/auth-helpers';

export async function POST(request: Request) {
  const { token, full_name, password } = await request.json();
  if (!token || !password) return NextResponse.json({ error: 'token and password required' }, { status: 400 });

  const db = getDb();
  const invRes = await db.query('SELECT * FROM invites WHERE token = $1', [token]);
  const invite = invRes.rows[0];

  if (!invite || invite.used_at || new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Invalid or expired invite' }, { status: 400 });
  }

  const existing = await db.query('SELECT id FROM users WHERE email = $1', [invite.email]);
  if (existing.rows.length > 0) return NextResponse.json({ error: 'Email already registered' }, { status: 409 });

  const hash = await hashPassword(password);
  const userRes = await db.query(
    'INSERT INTO users (tenant_id, email, password_hash, full_name, role) VALUES ($1,$2,$3,$4,$5) RETURNING id',
    [invite.tenant_id, invite.email, hash, full_name || invite.email, invite.role]
  );
  const userId = userRes.rows[0].id;

  if (invite.warehouse_number) {
    await db.query(
      'INSERT INTO user_warehouses (user_id, warehouse_number, tenant_id, role) VALUES ($1,$2,$3,$4)',
      [userId, invite.warehouse_number, invite.tenant_id, invite.role]
    );
  }

  await db.query('UPDATE invites SET used_at = NOW() WHERE token = $1', [token]);

  const warehouse_numbers = invite.warehouse_number ? [invite.warehouse_number] : [];
  const jwtToken = signToken({ user_id: userId, tenant_id: invite.tenant_id, email: invite.email, role: invite.role, warehouse_numbers });
  return NextResponse.json({ token: jwtToken, tenant_id: invite.tenant_id, user_id: userId, role: invite.role });
}
```

- [ ] **Step 6: Create me route**

File: `frontend/nexera-dispatch/app/api/auth/me/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getTokenFromRequest } from '@/lib/auth-helpers';

export async function GET(request: Request) {
  const caller = getTokenFromRequest(request);
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDb();
  const whRes = await db.query(
    'SELECT warehouse_number FROM user_warehouses WHERE user_id = $1 AND tenant_id = $2',
    [caller.user_id, caller.tenant_id]
  );
  const warehouse_numbers = whRes.rows.map((r: { warehouse_number: string }) => r.warehouse_number);

  return NextResponse.json({ ...caller, warehouse_numbers });
}
```

- [ ] **Step 7: Commit**

```bash
cd ../..
git add frontend/nexera-dispatch/app/api/auth/
git commit -m "feat: add auth API routes — signup, login, invite create/get/accept, me"
```

---

## Task 5: Connections API routes

**Files:**
- Create: `frontend/nexera-dispatch/app/api/connections/route.ts`
- Create: `frontend/nexera-dispatch/app/api/connections/[id]/test/route.ts`
- Create: `frontend/nexera-dispatch/app/api/connections/[id]/assign-manager/route.ts`

- [ ] **Step 1: Create connections list + save route**

File: `frontend/nexera-dispatch/app/api/connections/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getDb } from '@/lib/db';
import { getTokenFromRequest } from '@/lib/auth-helpers';

const APP_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const GCP_PROJECT = process.env.GOOGLE_PROJECT_ID || 'agentic-dispatch';

async function storeSecret(tenantId: string, connectionId: string, credentials: object): Promise<string> {
  if (process.env.NODE_ENV !== 'production') {
    return `local://${connectionId}`;
  }
  const { SecretManagerServiceClient } = await import('@google-cloud/secret-manager');
  const client = new SecretManagerServiceClient();
  const secretId = `nexera-${tenantId}-conn-${connectionId}`;
  const parent = `projects/${GCP_PROJECT}`;
  try {
    await client.createSecret({ parent, secretId, secret: { replication: { automatic: {} } } });
  } catch (e: unknown) {
    if (!(e instanceof Error) || !e.message.includes('already exists')) throw e;
  }
  await client.addSecretVersion({
    parent: `${parent}/secrets/${secretId}`,
    payload: { data: Buffer.from(JSON.stringify(credentials)) },
  });
  return `projects/${GCP_PROJECT}/secrets/${secretId}`;
}

export async function GET(request: Request) {
  const caller = getTokenFromRequest(request);
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDb();
  const res = await db.query(
    'SELECT id, name, erp_type, auth_type, base_url, status FROM connections WHERE tenant_id = $1',
    [caller.tenant_id]
  );
  return NextResponse.json(res.rows);
}

export async function POST(request: Request) {
  const caller = getTokenFromRequest(request);
  if (!caller || caller.role !== 'it_admin') return NextResponse.json({ error: 'IT Admin only' }, { status: 403 });

  const body = await request.json();
  const { name, erp_type, auth_type, base_url, api_key, username, password, token_url, client_id, client_secret } = body;
  if (!name || !erp_type || !auth_type || !base_url) {
    return NextResponse.json({ error: 'name, erp_type, auth_type, base_url required' }, { status: 400 });
  }

  const connectionId = randomUUID();
  const credentials = { auth_type, api_key, username, password, token_url, client_id, client_secret };
  const secretRef = await storeSecret(caller.tenant_id, connectionId, credentials);

  const db = getDb();
  await db.query(
    'INSERT INTO connections (id, tenant_id, name, erp_type, auth_type, base_url, secret_ref, status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
    [connectionId, caller.tenant_id, name, erp_type, auth_type, base_url, secretRef, 'active']
  );

  return NextResponse.json({ connection_id: connectionId, status: 'active', message: 'Connection saved' });
}
```

- [ ] **Step 2: Create connections test route**

File: `frontend/nexera-dispatch/app/api/connections/[id]/test/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getDb } from '@/lib/db';
import { getTokenFromRequest } from '@/lib/auth-helpers';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const caller = getTokenFromRequest(request);
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: connectionId } = await params;
  const db = getDb();
  const connRes = await db.query(
    'SELECT * FROM connections WHERE id = $1 AND tenant_id = $2',
    [connectionId, caller.tenant_id]
  );
  const conn = connRes.rows[0];
  if (!conn) return NextResponse.json({ error: 'Connection not found' }, { status: 404 });

  try {
    const sapKey = process.env.SAP_SANDBOX_API_KEY;
    const headers: Record<string, string> = {};
    if (sapKey) headers['APIKey'] = sapKey;

    const metaUrl = `${conn.base_url}/$metadata`;
    const res = await fetch(metaUrl, { headers, signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    // For SAP sandbox, return known demo warehouses
    const warehouseNumbers = ['0001', '0002'];
    for (const wn of warehouseNumbers) {
      const exists = await db.query(
        'SELECT id FROM warehouses WHERE tenant_id = $1 AND warehouse_number = $2',
        [caller.tenant_id, wn]
      );
      if (exists.rows.length === 0) {
        await db.query(
          'INSERT INTO warehouses (id, tenant_id, connection_id, warehouse_number, name) VALUES ($1,$2,$3,$4,$5)',
          [randomUUID(), caller.tenant_id, connectionId, wn, `Warehouse ${wn}`]
        );
      }
    }

    return NextResponse.json({ success: true, message: 'Connection verified', warehouse_numbers: warehouseNumbers });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ success: false, message: `Connection failed: ${msg}`, warehouse_numbers: [] });
  }
}
```

- [ ] **Step 3: Create assign-manager route**

File: `frontend/nexera-dispatch/app/api/connections/[id]/assign-manager/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getDb } from '@/lib/db';
import { getTokenFromRequest } from '@/lib/auth-helpers';

const APP_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const caller = getTokenFromRequest(request);
  if (!caller || caller.role !== 'it_admin') return NextResponse.json({ error: 'IT Admin only' }, { status: 403 });

  const { warehouse_number, manager_email } = await request.json();
  if (!warehouse_number || !manager_email) {
    return NextResponse.json({ error: 'warehouse_number and manager_email required' }, { status: 400 });
  }

  const { id: connectionId } = await params;
  const token = randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 86400000).toISOString();

  const db = getDb();
  await db.query(
    'INSERT INTO invites (tenant_id, email, role, warehouse_number, token, expires_at, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7)',
    [caller.tenant_id, manager_email, 'wh_manager', warehouse_number, token, expiresAt, caller.user_id]
  );

  return NextResponse.json({ invite_url: `${APP_BASE_URL}/invite?token=${token}` });
}
```

- [ ] **Step 4: Commit**

```bash
cd ../..
git add frontend/nexera-dispatch/app/api/connections/
git commit -m "feat: add connections API routes — list, save, test, assign-manager"
```

---

## Task 6: Smoke test all API routes locally

**Files:** No file changes — manual smoke test.

- [ ] **Step 1: Start Next.js dev server**

```bash
cd frontend/nexera-dispatch
npm run dev
```

Expected: `Ready on http://localhost:3000`

- [ ] **Step 2: Test signup**

```bash
curl -s -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"company_name":"Acme Logistics","email":"admin@acme.com","password":"Test1234","full_name":"John Admin"}' | python3 -m json.tool
```

Expected: `{ "token": "...", "tenant_id": "...", "user_id": "...", "role": "it_admin" }`

- [ ] **Step 3: Test login and save token**

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@acme.com","password":"Test1234"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")
echo "Token: $TOKEN"
```

- [ ] **Step 4: Test createInvite**

```bash
INVITE_TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/invite/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"email":"manager@acme.com","role":"wh_manager","warehouse_number":"0001"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")
echo "Invite token: $INVITE_TOKEN"
```

Expected: invite_url with token.

- [ ] **Step 5: Test getInvite**

```bash
curl -s -X POST http://localhost:3000/api/auth/invite/get \
  -H "Content-Type: application/json" \
  -d "{\"token\":\"$INVITE_TOKEN\"}" | python3 -m json.tool
```

Expected: `{ "valid": true, "email": "manager@acme.com", "role": "wh_manager", ... }`

- [ ] **Step 6: Test acceptInvite**

```bash
curl -s -X POST http://localhost:3000/api/auth/invite/accept \
  -H "Content-Type: application/json" \
  -d "{\"token\":\"$INVITE_TOKEN\",\"full_name\":\"Jane Manager\",\"password\":\"Manager123\"}" | python3 -m json.tool
```

Expected: JWT with `role: "wh_manager"`.

- [ ] **Step 7: Test me**

```bash
curl -s http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

Expected: `{ "user_id": "...", "role": "it_admin", "email": "admin@acme.com", ... }`
