# Plan 2: Next.js Frontend — Auth + ERP Wizard + Dispatcher Dashboard

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the NeXera Dispatch Next.js frontend — login/signup/invite screens, IT Admin ERP connection wizard, WH Manager warehouse profile setup, and Dispatcher delivery dashboard with driver assignment and QR code generation.

**Architecture:** Next.js 14 App Router in `frontend/nexera-dispatch/`. API calls go to the existing `cap-srv` Cloud Run backend. Auth state is a JWT stored in `localStorage`, passed as `Authorization: Bearer` on every request. No SSR needed for protected pages — all client components. Deployed to Vercel.

**Tech Stack:** Next.js 14 (App Router), Tailwind CSS, shadcn/ui, `lucide-react` icons. No Vercel AI SDK yet — that's Plan 3. All API calls use plain `fetch`.

**Theme: Slate Indigo (Theme B)** — warm dark slate `#0f1117` background, indigo `#6366f1` accent. Use `bg-indigo-600 hover:bg-indigo-700` and `text-indigo-400` everywhere the plan writes `bg-purple-600` or `text-purple-400`. The `globals.css` `:root` block in Task 1 Step 5 must use these CSS variables:
```css
--background: 222 33% 7%;   --primary: 239 84% 67%;   --card: 222 33% 10%;
--secondary: 222 33% 14%;   --border: 222 33% 14%;     --ring: 239 84% 67%;
--muted-foreground: 215 20% 45%;  --foreground: 214 32% 91%;
```

**Prerequisites:** Plan 1 (DB + Auth API) must be complete and `cap-srv` deployed with auth endpoints live.

---

## File Map

```
frontend/nexera-dispatch/
├── app/
│   ├── layout.tsx                   Root layout — dark background, font
│   ├── page.tsx                     Landing page (minimal — hero + CTA)
│   ├── login/page.tsx               Login screen
│   ├── signup/page.tsx              Company signup
│   ├── invite/page.tsx              Accept invite (reads ?token=)
│   ├── dashboard/
│   │   ├── layout.tsx               Protected layout — checks JWT, redirects to login if missing
│   │   ├── page.tsx                 Role router — redirects to /dashboard/admin, /dashboard/dispatcher etc
│   │   ├── admin/
│   │   │   ├── page.tsx             IT Admin home — connections list + add connection CTA
│   │   │   └── wizard/page.tsx      Add ERP connection wizard (4 steps)
│   │   ├── warehouse/
│   │   │   ├── page.tsx             WH Manager home — warehouse selector + team invite
│   │   │   └── profile/page.tsx     Warehouse profile setup (address, hours, lat/lng)
│   │   └── dispatch/
│   │       ├── page.tsx             Dispatcher dashboard — KPIs + delivery list
│   │       └── [deliveryId]/page.tsx  Delivery detail — items, driver assign, QR
├── components/
│   ├── navbar.tsx                   Top nav — logo, warehouse selector, Ask AI button, avatar
│   ├── kpi-card.tsx                 KPI summary tile
│   ├── delivery-table.tsx           Sortable/filterable deliveries list
│   ├── delivery-status-badge.tsx    Coloured status pill
│   ├── driver-assign-form.tsx       Name + mobile + Assign button
│   ├── qr-display.tsx               QR code display + copy/share actions
│   └── step-wizard.tsx              Generic 4-step wizard shell
├── lib/
│   ├── api.ts                       All fetch calls to cap-srv — typed wrappers
│   ├── auth.ts                      getToken(), setToken(), clearToken(), getMe()
│   └── types.ts                     Shared TypeScript types
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── next.config.ts
```

---

## Task 1: Scaffold Next.js project

**Files:**
- Create: `frontend/nexera-dispatch/` (entire scaffold)

- [ ] **Step 1: Create Next.js app**

```bash
cd frontend
npx create-next-app@14 nexera-dispatch \
  --typescript \
  --tailwind \
  --app \
  --no-src-dir \
  --import-alias "@/*"
```

Accept all defaults when prompted.

- [ ] **Step 2: Install shadcn/ui**

```bash
cd frontend/nexera-dispatch
npx shadcn@latest init
```

When prompted:
- Style: **Default**
- Base color: **Slate**
- CSS variables: **Yes**

- [ ] **Step 3: Install required shadcn components**

```bash
npx shadcn@latest add button input label card badge table tabs select dialog
```

- [ ] **Step 4: Install lucide-react (icons)**

```bash
npm install lucide-react
```

- [ ] **Step 5: Set dark background in globals.css**

Open `app/globals.css`. Replace the `:root` and `.dark` blocks with:

```css
:root {
  --background: 222 47% 4%;
  --foreground: 210 40% 98%;
  --card: 222 47% 6%;
  --card-foreground: 210 40% 98%;
  --popover: 222 47% 6%;
  --popover-foreground: 210 40% 98%;
  --primary: 263 70% 58%;
  --primary-foreground: 210 40% 98%;
  --secondary: 217 33% 17%;
  --secondary-foreground: 210 40% 98%;
  --muted: 217 33% 17%;
  --muted-foreground: 215 20% 65%;
  --accent: 217 33% 17%;
  --accent-foreground: 210 40% 98%;
  --destructive: 0 84% 60%;
  --destructive-foreground: 210 40% 98%;
  --border: 217 33% 17%;
  --input: 217 33% 17%;
  --ring: 263 70% 58%;
  --radius: 0.75rem;
}
```

- [ ] **Step 6: Set CAP_URL env var**

Create `frontend/nexera-dispatch/.env.local`:

```
NEXT_PUBLIC_CAP_URL=https://cap-srv-1069189829983.us-central1.run.app
NEXT_PUBLIC_AGENTS_URL=https://agents-<your-hash>.us-central1.run.app
```

Replace the agents URL with your actual Cloud Run agents URL.

- [ ] **Step 7: Verify dev server starts**

```bash
cd frontend/nexera-dispatch
npm run dev
```

Open http://localhost:3000. Expected: default Next.js welcome page with dark background.

- [ ] **Step 8: Commit**

```bash
cd ../..
git add frontend/nexera-dispatch
git commit -m "feat: scaffold Next.js 14 app with shadcn/ui dark theme"
```

---

## Task 2: Auth utilities and API client

**Files:**
- Create: `frontend/nexera-dispatch/lib/types.ts`
- Create: `frontend/nexera-dispatch/lib/auth.ts`
- Create: `frontend/nexera-dispatch/lib/api.ts`

- [ ] **Step 1: Create types.ts**

File: `frontend/nexera-dispatch/lib/types.ts`

```typescript
export type Role = 'it_admin' | 'wh_manager' | 'dispatcher' | 'supervisor';

export interface AuthUser {
  user_id: string;
  tenant_id: string;
  email: string;
  full_name: string;
  role: Role;
  warehouse_numbers: string[];
}

export interface AuthResponse {
  token: string;
  tenant_id: string;
  user_id: string;
  role: Role;
  warehouse_numbers?: string[];
}

export interface InviteDetails {
  valid: boolean;
  email: string;
  role: Role | '';
  warehouse_number: string;
  tenant_id: string;
}

export interface Connection {
  id: string;
  name: string;
  erp_type: string;
  auth_type: string;
  base_url: string;
  status: string;
}

export interface Warehouse {
  id: string;
  warehouse_number: string;
  name: string;
  connection_id: string;
  physical_address?: string;
  city?: string;
  country?: string;
  postal_code?: string;
  latitude?: number;
  longitude?: number;
  working_hours_start?: string;
  working_hours_end?: string;
  working_days?: string;
}

export interface Delivery {
  id: string;
  delivery_id: string;
  status: string;
  planned_gi_date: string;
  ship_to_name: string;
  ship_to_address: string;
  ship_to_email?: string;
  ship_to_mobile?: string;
  shipping_point: string;
  route: string;
  weight_kg: number;
  driver_name?: string;
  driver_mobile?: string;
  qr_token?: string;
  source_erp: string;
  warehouse_number: string;
}

export interface DeliveryItem {
  id: string;
  item_no: string;
  material: string;
  qty: number;
  unit: string;
}
```

- [ ] **Step 2: Create auth.ts**

File: `frontend/nexera-dispatch/lib/auth.ts`

```typescript
import type { AuthUser } from './types';

const TOKEN_KEY = 'nexera_token';

export function setToken(token: string) {
  if (typeof window !== 'undefined') localStorage.setItem(TOKEN_KEY, token);
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function clearToken() {
  if (typeof window !== 'undefined') localStorage.removeItem(TOKEN_KEY);
}

export function decodeToken(token: string): AuthUser | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return {
      user_id: payload.user_id,
      tenant_id: payload.tenant_id,
      email: payload.email,
      full_name: payload.full_name || payload.email,
      role: payload.role,
      warehouse_numbers: payload.warehouse_numbers || [],
    };
  } catch {
    return null;
  }
}

export function getCurrentUser(): AuthUser | null {
  const token = getToken();
  if (!token) return null;
  return decodeToken(token);
}

export function isAuthenticated(): boolean {
  return getCurrentUser() !== null;
}
```

- [ ] **Step 3: Create api.ts**

File: `frontend/nexera-dispatch/lib/api.ts`

Auth/connections calls go to local Next.js API routes (`/api/...`).
Delivery calls go to the external `cap-srv` Cloud Run service (SAP OData proxy).

```typescript
import { getToken } from './auth';
import type { AuthResponse, InviteDetails, Connection, Warehouse, Delivery, DeliveryItem } from './types';

const CAP = process.env.NEXT_PUBLIC_CAP_URL!;

// ── Internal helpers ──────────────────────────────────────────────────

async function apiPost<T>(path: string, body: unknown, auth = false): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(path, { method: 'POST', headers, body: JSON.stringify(body) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || data.message || 'Request failed');
  return data;
}

async function apiGet<T>(path: string, auth = false): Promise<T> {
  const headers: Record<string, string> = {};
  if (auth) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(path, { headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || data.message || 'Request failed');
  return data;
}

// For cap-srv OData — responses have a .value wrapper
async function capGet<T>(path: string): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${CAP}${path}`, { headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || data.message || 'Request failed');
  return (data.value ?? data) as T;
}

async function capPost<T>(path: string, body: unknown): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${CAP}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || data.message || 'Request failed');
  return (data.value ?? data) as T;
}

// ── Auth (Next.js API routes) ─────────────────────────────────────────

export const signup = (company_name: string, email: string, password: string, full_name: string) =>
  apiPost<AuthResponse>('/api/auth/signup', { company_name, email, password, full_name });

export const login = (email: string, password: string) =>
  apiPost<AuthResponse>('/api/auth/login', { email, password });

export const getInvite = (token: string) =>
  apiPost<InviteDetails>('/api/auth/invite/get', { token });

export const acceptInvite = (token: string, full_name: string, password: string) =>
  apiPost<AuthResponse>('/api/auth/invite/accept', { token, full_name, password });

export const createInvite = (email: string, role: string, warehouse_number?: string) =>
  apiPost<{ invite_url: string; token: string }>('/api/auth/invite/create', { email, role, warehouse_number }, true);

export const getMe = () =>
  apiGet<{ user_id: string; email: string; full_name: string; role: string; warehouse_numbers: string[] }>('/api/auth/me', true);

// ── Connections (Next.js API routes) ─────────────────────────────────

export const listConnections = () =>
  apiGet<Connection[]>('/api/connections', true);

export const saveConnection = (data: {
  name: string; erp_type: string; auth_type: string; base_url: string;
  api_key?: string; username?: string; password?: string;
  token_url?: string; client_id?: string; client_secret?: string;
}) => apiPost<{ connection_id: string; status: string; message: string }>('/api/connections', data, true);

export const testConnection = (connection_id: string) =>
  apiPost<{ success: boolean; message: string; warehouse_numbers: string[] }>(`/api/connections/${connection_id}/test`, {}, true);

export const assignWarehouseManager = (connection_id: string, warehouse_number: string, manager_email: string) =>
  apiPost<{ invite_url: string }>(`/api/connections/${connection_id}/assign-manager`, { warehouse_number, manager_email }, true);

// ── Deliveries (cap-srv Cloud Run — SAP OData proxy) ──────────────────

export const listDeliveries = (warehouse_number: string) =>
  capGet<Delivery[]>(`/odata/v4/ewm/OutboundDeliveries?$filter=WarehouseNumber eq '${warehouse_number}'&$top=100`);

export const getDelivery = (deliveryId: string) =>
  capGet<Delivery>(`/odata/v4/ewm/OutboundDeliveries('${deliveryId}')`);

export const getDeliveryItems = (deliveryDoc: string) =>
  capPost<DeliveryItem[]>('/odata/v4/ewm/getDeliveryItems', { deliveryDoc });

export const assignDriver = (deliveryDoc: string, mobileNumber: string, driverName: string, truckRegistration: string) =>
  capPost<{ QRCodeImage: string; QRCodeUrl: string }>('/odata/v4/tracking/assignDriver', { deliveryDoc, mobileNumber, driverName, truckRegistration });

// ── Warehouses (local DB via API routes) ─────────────────────────────

export const listWarehouses = () =>
  apiGet<Warehouse[]>('/api/warehouses', true);
```

- [ ] **Step 4: Commit**

```bash
git add frontend/nexera-dispatch/lib/
git commit -m "feat: add auth utilities and typed API client"
```

---

## Task 3: Login, Signup, Invite pages

**Files:**
- Modify: `frontend/nexera-dispatch/app/layout.tsx`
- Create: `frontend/nexera-dispatch/app/login/page.tsx`
- Create: `frontend/nexera-dispatch/app/signup/page.tsx`
- Create: `frontend/nexera-dispatch/app/invite/page.tsx`
- Modify: `frontend/nexera-dispatch/app/page.tsx`

- [ ] **Step 1: Update root layout**

File: `frontend/nexera-dispatch/app/layout.tsx`

```tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'NeXera Dispatch',
  description: 'AI-powered logistics dispatch platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-background text-foreground min-h-screen`}>
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Create landing page**

File: `frontend/nexera-dispatch/app/page.tsx`

```tsx
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 text-sm font-medium text-purple-400 tracking-widest uppercase">NeXera Dispatch</div>
      <h1 className="text-5xl font-black text-white mb-4 max-w-2xl leading-tight">
        One platform. Every ERP. Every fleet.
      </h1>
      <p className="text-lg text-muted-foreground mb-10 max-w-xl">
        AI-powered outbound delivery dispatch — connect SAP, Odoo or Oracle and give your team one intelligent workspace.
      </p>
      <div className="flex gap-4">
        <Button asChild size="lg" className="bg-purple-600 hover:bg-purple-700">
          <Link href="/signup">Start Free Trial</Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href="/login">Sign In</Link>
        </Button>
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Create login page**

File: `frontend/nexera-dispatch/app/login/page.tsx`

```tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { login } from '@/lib/api';
import { setToken } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await login(email, password);
      setToken(res.token);
      router.push('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Sign in</CardTitle>
          <CardDescription>NeXera Dispatch</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
            </div>
            <div className="space-y-1">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            No account?{' '}
            <Link href="/signup" className="text-purple-400 hover:underline">Start free trial</Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
```

- [ ] **Step 4: Create signup page**

File: `frontend/nexera-dispatch/app/signup/page.tsx`

```tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { signup } from '@/lib/api';
import { setToken } from '@/lib/auth';

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ company_name: '', full_name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function set(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await signup(form.company_name, form.email, form.password, form.full_name);
      setToken(res.token);
      router.push('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Signup failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Start free trial</CardTitle>
          <CardDescription>NeXera Dispatch — 14 days, no credit card</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label>Company name</Label>
              <Input value={form.company_name} onChange={set('company_name')} required autoFocus />
            </div>
            <div className="space-y-1">
              <Label>Your name</Label>
              <Input value={form.full_name} onChange={set('full_name')} required />
            </div>
            <div className="space-y-1">
              <Label>Work email</Label>
              <Input type="email" value={form.email} onChange={set('email')} required />
            </div>
            <div className="space-y-1">
              <Label>Password</Label>
              <Input type="password" value={form.password} onChange={set('password')} required minLength={8} />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700" disabled={loading}>
              {loading ? 'Creating account…' : 'Create account'}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="text-purple-400 hover:underline">Sign in</Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
```

- [ ] **Step 5: Create invite accept page**

File: `frontend/nexera-dispatch/app/invite/page.tsx`

```tsx
'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { getInvite, acceptInvite } from '@/lib/api';
import { setToken } from '@/lib/auth';
import type { InviteDetails } from '@/lib/types';

export default function InvitePage() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token') || '';
  const [invite, setInvite] = useState<InviteDetails | null>(null);
  const [form, setForm] = useState({ full_name: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    getInvite(token).then(setInvite).catch(() => setInvite({ valid: false, email: '', role: '', warehouse_number: '', tenant_id: '' }));
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await acceptInvite(token, form.full_name, form.password);
      setToken(res.token);
      router.push('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to accept invite');
    } finally {
      setLoading(false);
    }
  }

  if (!invite) return <main className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground">Loading invite…</p></main>;

  if (!invite.valid) return (
    <main className="min-h-screen flex items-center justify-center">
      <Card className="w-full max-w-sm">
        <CardHeader><CardTitle>Invite invalid or expired</CardTitle></CardHeader>
        <CardContent><p className="text-muted-foreground text-sm">This invite link is no longer valid. Ask your administrator to resend it.</p></CardContent>
      </Card>
    </main>
  );

  const roleLabel: Record<string, string> = { wh_manager: 'Warehouse Manager', dispatcher: 'Dispatcher', supervisor: 'Supervisor' };

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>You&apos;re invited</CardTitle>
          <CardDescription>
            Join as <strong>{roleLabel[invite.role] || invite.role}</strong>
            {invite.warehouse_number && ` — Warehouse ${invite.warehouse_number}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">Invited email: <strong>{invite.email}</strong></p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label>Your name</Label>
              <Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} required autoFocus />
            </div>
            <div className="space-y-1">
              <Label>Set password</Label>
              <Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required minLength={8} />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700" disabled={loading}>
              {loading ? 'Setting up account…' : 'Accept & get started'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
```

- [ ] **Step 6: Test auth screens in browser**

```bash
cd frontend/nexera-dispatch && npm run dev
```

Visit:
- http://localhost:3000 — landing page with two buttons
- http://localhost:3000/signup — fill form, submit, redirects to /dashboard (will 404 for now — that's fine)
- http://localhost:3000/login — fill credentials from signup, redirects to /dashboard
- http://localhost:3000/invite?token=invalid — shows "Invite invalid" message

- [ ] **Step 7: Commit**

```bash
cd ../..
git add frontend/nexera-dispatch/app/
git commit -m "feat: add login, signup, and invite accept pages"
```

---

## Task 4: Protected dashboard layout and role router

**Files:**
- Create: `frontend/nexera-dispatch/app/dashboard/layout.tsx`
- Create: `frontend/nexera-dispatch/app/dashboard/page.tsx`

- [ ] **Step 1: Create dashboard layout (auth guard)**

File: `frontend/nexera-dispatch/app/dashboard/layout.tsx`

```tsx
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  useEffect(() => {
    if (!isAuthenticated()) router.replace('/login');
  }, [router]);
  return <>{children}</>;
}
```

- [ ] **Step 2: Create dashboard role router**

File: `frontend/nexera-dispatch/app/dashboard/page.tsx`

```tsx
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';

export default function DashboardPage() {
  const router = useRouter();
  useEffect(() => {
    const user = getCurrentUser();
    if (!user) { router.replace('/login'); return; }
    if (user.role === 'it_admin') router.replace('/dashboard/admin');
    else if (user.role === 'wh_manager') router.replace('/dashboard/warehouse');
    else router.replace('/dashboard/dispatch');
  }, [router]);
  return <main className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground">Loading…</p></main>;
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/nexera-dispatch/app/dashboard/
git commit -m "feat: add protected dashboard layout with role-based routing"
```

---

## Task 5: Navbar component

**Files:**
- Create: `frontend/nexera-dispatch/components/navbar.tsx`

- [ ] **Step 1: Create navbar**

File: `frontend/nexera-dispatch/components/navbar.tsx`

```tsx
'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { clearToken, getCurrentUser } from '@/lib/auth';
import { LogOut, Bot } from 'lucide-react';

interface NavbarProps {
  warehouseLabel?: string;
  onAskAI?: () => void;
}

export function Navbar({ warehouseLabel, onAskAI }: NavbarProps) {
  const router = useRouter();
  const user = getCurrentUser();

  function handleLogout() {
    clearToken();
    router.replace('/login');
  }

  return (
    <header className="h-14 border-b border-border flex items-center px-6 gap-4 sticky top-0 bg-background/90 backdrop-blur z-40">
      <Link href="/dashboard" className="flex items-center gap-2 font-bold text-white text-lg">
        <span className="text-purple-400">NeXera</span>
        <span className="text-muted-foreground font-normal text-sm">Dispatch</span>
      </Link>
      {warehouseLabel && (
        <span className="text-xs px-2 py-1 rounded-md bg-secondary text-muted-foreground">{warehouseLabel}</span>
      )}
      <div className="flex-1" />
      {onAskAI && (
        <Button variant="outline" size="sm" onClick={onAskAI} className="gap-2">
          <Bot size={14} />
          Ask AI
        </Button>
      )}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground hidden sm:block">{user?.email}</span>
        <Button variant="ghost" size="icon" onClick={handleLogout} title="Sign out">
          <LogOut size={16} />
        </Button>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/nexera-dispatch/components/navbar.tsx
git commit -m "feat: add Navbar component with warehouse label and Ask AI button"
```

---

## Task 6: IT Admin dashboard + ERP connection wizard

**Files:**
- Create: `frontend/nexera-dispatch/app/dashboard/admin/page.tsx`
- Create: `frontend/nexera-dispatch/app/dashboard/admin/wizard/page.tsx`
- Create: `frontend/nexera-dispatch/components/step-wizard.tsx`

- [ ] **Step 1: Create step-wizard shell component**

File: `frontend/nexera-dispatch/components/step-wizard.tsx`

```tsx
interface StepWizardProps {
  steps: string[];
  current: number;
  children: React.ReactNode;
}

export function StepWizard({ steps, current, children }: StepWizardProps) {
  return (
    <div>
      <ol className="flex gap-2 mb-8">
        {steps.map((label, i) => (
          <li key={label} className="flex items-center gap-2 text-sm">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              i < current ? 'bg-purple-600 text-white' :
              i === current ? 'bg-purple-600 text-white ring-2 ring-purple-400' :
              'bg-secondary text-muted-foreground'
            }`}>{i + 1}</span>
            <span className={i === current ? 'text-white font-medium' : 'text-muted-foreground'}>{label}</span>
            {i < steps.length - 1 && <span className="text-muted-foreground mx-1">›</span>}
          </li>
        ))}
      </ol>
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Create IT Admin home page**

File: `frontend/nexera-dispatch/app/dashboard/admin/page.tsx`

```tsx
'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { listConnections } from '@/lib/api';
import type { Connection } from '@/lib/types';
import { Plus, Server } from 'lucide-react';

export default function AdminPage() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listConnections().then(setConnections).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">ERP Connections</h1>
            <p className="text-muted-foreground text-sm mt-1">Connect your ERP systems to start dispatching</p>
          </div>
          <Button asChild className="bg-purple-600 hover:bg-purple-700 gap-2">
            <Link href="/dashboard/admin/wizard"><Plus size={16} /> Add Connection</Link>
          </Button>
        </div>
        {loading ? (
          <p className="text-muted-foreground">Loading connections…</p>
        ) : connections.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
              <Server size={40} className="text-muted-foreground" />
              <p className="text-muted-foreground text-sm">No ERP connections yet</p>
              <Button asChild className="bg-purple-600 hover:bg-purple-700">
                <Link href="/dashboard/admin/wizard">Add your first connection</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {connections.map(conn => (
              <Card key={conn.id}>
                <CardHeader className="py-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{conn.name}</CardTitle>
                    <Badge variant={conn.status === 'active' ? 'default' : 'secondary'}>{conn.status}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{conn.erp_type} · {conn.auth_type} · {conn.base_url}</p>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Create ERP connection wizard**

File: `frontend/nexera-dispatch/app/dashboard/admin/wizard/page.tsx`

```tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/navbar';
import { StepWizard } from '@/components/step-wizard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { saveConnection, testConnection, assignWarehouseManager } from '@/lib/api';
import { CheckCircle, XCircle, Loader2, Copy } from 'lucide-react';

const WIZARD_STEPS = ['ERP System', 'Auth Type', 'Credentials', 'Warehouses'];

const ERP_OPTIONS = [
  { value: 'SAP_S4', label: 'SAP S/4HANA', live: true },
  { value: 'SAP_ECC', label: 'SAP ECC (LE-WM)', live: false },
  { value: 'ODOO', label: 'Odoo WMS', live: false },
  { value: 'ORACLE', label: 'Oracle WMS Cloud', live: false },
];

const AUTH_OPTIONS: Record<string, { value: string; label: string }[]> = {
  SAP_S4: [
    { value: 'api_key', label: 'API Key (SAP API Business Hub)' },
    { value: 'basic', label: 'Basic Auth (username / password)' },
    { value: 'oauth2', label: 'OAuth 2.0 (client credentials)' },
  ],
};

export default function WizardPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    name: '', erp_type: '', auth_type: '',
    base_url: '', api_key: '', username: '', password: '',
    token_url: '', client_id: '', client_secret: '',
  });
  const [connectionId, setConnectionId] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; warehouse_numbers: string[] } | null>(null);
  const [managerEmails, setManagerEmails] = useState<Record<string, string>>({});
  const [inviteUrls, setInviteUrls] = useState<Record<string, string>>({});
  const [error, setError] = useState('');

  function set(field: string) {
    return (value: string) => setForm(f => ({ ...f, [field]: value }));
  }

  async function handleSaveAndTest() {
    setError('');
    setTesting(true);
    try {
      const saved = await saveConnection(form);
      setConnectionId(saved.connection_id);
      const result = await testConnection(saved.connection_id);
      setTestResult(result);
      if (result.success) setStep(3);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save connection');
    } finally {
      setTesting(false);
    }
  }

  async function handleAssignManager(wn: string) {
    const email = managerEmails[wn];
    if (!email) return;
    try {
      const res = await assignWarehouseManager(connectionId, wn, email);
      setInviteUrls(u => ({ ...u, [wn]: res.invite_url }));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send invite');
    }
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-2xl mx-auto px-6 py-8">
        <h1 className="text-xl font-bold text-white mb-6">Add ERP Connection</h1>
        <StepWizard steps={WIZARD_STEPS} current={step}>

          {/* Step 0: ERP System */}
          {step === 0 && (
            <Card><CardContent className="pt-6 space-y-4">
              <div className="space-y-1">
                <Label>Connection name</Label>
                <Input placeholder="e.g. Hamburg SAP S/4" value={form.name} onChange={e => set('name')(e.target.value)} autoFocus />
              </div>
              <div className="space-y-1">
                <Label>ERP System</Label>
                <Select value={form.erp_type} onValueChange={set('erp_type')}>
                  <SelectTrigger><SelectValue placeholder="Select ERP system" /></SelectTrigger>
                  <SelectContent>
                    {ERP_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value} disabled={!opt.live}>
                        {opt.label}{!opt.live && ' — Coming Soon'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Base URL</Label>
                <Input placeholder="https://sandbox.api.sap.com/s4hanacloud/sap/opu/odata/sap" value={form.base_url} onChange={e => set('base_url')(e.target.value)} />
              </div>
              <Button className="bg-purple-600 hover:bg-purple-700" onClick={() => setStep(1)} disabled={!form.name || !form.erp_type || !form.base_url}>
                Next →
              </Button>
            </CardContent></Card>
          )}

          {/* Step 1: Auth Type */}
          {step === 1 && (
            <Card><CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label>Authentication type</Label>
                {(AUTH_OPTIONS[form.erp_type] || []).map(opt => (
                  <div key={opt.value} onClick={() => set('auth_type')(opt.value)}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${form.auth_type === opt.value ? 'border-purple-500 bg-purple-950/30' : 'border-border hover:border-muted-foreground'}`}>
                    <p className="text-sm font-medium text-white">{opt.label}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(0)}>← Back</Button>
                <Button className="bg-purple-600 hover:bg-purple-700" onClick={() => setStep(2)} disabled={!form.auth_type}>Next →</Button>
              </div>
            </CardContent></Card>
          )}

          {/* Step 2: Credentials */}
          {step === 2 && (
            <Card><CardContent className="pt-6 space-y-4">
              {form.auth_type === 'api_key' && (
                <div className="space-y-1">
                  <Label>API Key</Label>
                  <Input type="password" value={form.api_key} onChange={e => set('api_key')(e.target.value)} autoFocus />
                </div>
              )}
              {form.auth_type === 'basic' && (<>
                <div className="space-y-1"><Label>Username</Label><Input value={form.username} onChange={e => set('username')(e.target.value)} autoFocus /></div>
                <div className="space-y-1"><Label>Password</Label><Input type="password" value={form.password} onChange={e => set('password')(e.target.value)} /></div>
              </>)}
              {form.auth_type === 'oauth2' && (<>
                <div className="space-y-1"><Label>Token URL</Label><Input value={form.token_url} onChange={e => set('token_url')(e.target.value)} autoFocus /></div>
                <div className="space-y-1"><Label>Client ID</Label><Input value={form.client_id} onChange={e => set('client_id')(e.target.value)} /></div>
                <div className="space-y-1"><Label>Client Secret</Label><Input type="password" value={form.client_secret} onChange={e => set('client_secret')(e.target.value)} /></div>
              </>)}
              {testResult && (
                <div className={`p-3 rounded-lg text-sm ${testResult.success ? 'bg-green-950/30 border border-green-800' : 'bg-red-950/30 border border-red-800'}`}>
                  <div className="flex items-center gap-2">
                    {testResult.success ? <CheckCircle size={16} className="text-green-400" /> : <XCircle size={16} className="text-red-400" />}
                    <span>{testResult.message}</span>
                  </div>
                </div>
              )}
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)}>← Back</Button>
                <Button className="bg-purple-600 hover:bg-purple-700" onClick={handleSaveAndTest} disabled={testing}>
                  {testing ? <><Loader2 size={14} className="animate-spin mr-2" />Testing…</> : 'Test & Save →'}
                </Button>
              </div>
            </CardContent></Card>
          )}

          {/* Step 3: Warehouses */}
          {step === 3 && testResult?.success && (
            <Card><CardContent className="pt-6 space-y-4">
              <p className="text-sm text-muted-foreground">Discovered {testResult.warehouse_numbers.length} warehouse(s). Optionally assign a manager now.</p>
              {testResult.warehouse_numbers.map(wn => (
                <div key={wn} className="p-3 border border-border rounded-lg space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">WH {wn}</Badge>
                  </div>
                  {inviteUrls[wn] ? (
                    <div className="flex items-center gap-2">
                      <Input value={inviteUrls[wn]} readOnly className="text-xs" />
                      <Button size="icon" variant="ghost" onClick={() => navigator.clipboard.writeText(inviteUrls[wn])}><Copy size={14} /></Button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Input placeholder="manager@company.com" value={managerEmails[wn] || ''} onChange={e => setManagerEmails(m => ({ ...m, [wn]: e.target.value }))} />
                      <Button variant="outline" size="sm" onClick={() => handleAssignManager(wn)}>Invite</Button>
                    </div>
                  )}
                </div>
              ))}
              <Button className="bg-purple-600 hover:bg-purple-700 w-full" onClick={() => router.push('/dashboard/admin')}>
                Done
              </Button>
            </CardContent></Card>
          )}

        </StepWizard>
      </main>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/nexera-dispatch/app/dashboard/admin/ frontend/nexera-dispatch/components/step-wizard.tsx
git commit -m "feat: IT Admin dashboard + 4-step ERP connection wizard"
```

---

## Task 7: Dispatcher dashboard and delivery list

**Files:**
- Create: `frontend/nexera-dispatch/components/kpi-card.tsx`
- Create: `frontend/nexera-dispatch/components/delivery-status-badge.tsx`
- Create: `frontend/nexera-dispatch/components/delivery-table.tsx`
- Create: `frontend/nexera-dispatch/app/dashboard/dispatch/page.tsx`

- [ ] **Step 1: Create KPI card component**

File: `frontend/nexera-dispatch/components/kpi-card.tsx`

```tsx
interface KpiCardProps {
  label: string;
  value: number;
  highlight?: boolean;
  warning?: boolean;
}

export function KpiCard({ label, value, highlight, warning }: KpiCardProps) {
  return (
    <div className={`rounded-xl border p-5 ${warning ? 'border-yellow-700 bg-yellow-950/20' : highlight ? 'border-purple-700 bg-purple-950/20' : 'border-border bg-card'}`}>
      <div className={`text-3xl font-black mb-1 ${warning ? 'text-yellow-400' : highlight ? 'text-purple-400' : 'text-white'}`}>{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}
```

- [ ] **Step 2: Create delivery status badge**

File: `frontend/nexera-dispatch/components/delivery-status-badge.tsx`

```tsx
const STATUS_STYLES: Record<string, string> = {
  'Open':       'bg-blue-950 text-blue-300 border-blue-800',
  'In Transit': 'bg-purple-950 text-purple-300 border-purple-800',
  'Delayed':    'bg-yellow-950 text-yellow-300 border-yellow-800',
  'Delivered':  'bg-green-950 text-green-300 border-green-800',
  'default':    'bg-secondary text-muted-foreground border-border',
};

export function DeliveryStatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES['default'];
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${style}`}>{status}</span>
  );
}
```

- [ ] **Step 3: Create delivery table**

File: `frontend/nexera-dispatch/components/delivery-table.tsx`

```tsx
'use client';
import Link from 'next/link';
import { DeliveryStatusBadge } from './delivery-status-badge';
import type { Delivery } from '@/lib/types';

interface DeliveryTableProps {
  deliveries: Delivery[];
}

export function DeliveryTable({ deliveries }: DeliveryTableProps) {
  if (deliveries.length === 0) {
    return <p className="text-center text-muted-foreground py-12">No deliveries found.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-secondary/50">
            <th className="text-left px-4 py-3 text-muted-foreground font-medium">Delivery No.</th>
            <th className="text-left px-4 py-3 text-muted-foreground font-medium">Ship-To</th>
            <th className="text-left px-4 py-3 text-muted-foreground font-medium">Status</th>
            <th className="text-left px-4 py-3 text-muted-foreground font-medium">Planned GI Date</th>
            <th className="text-left px-4 py-3 text-muted-foreground font-medium">Driver</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {deliveries.map(d => (
            <tr key={d.id} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
              <td className="px-4 py-3 font-mono text-purple-300">{d.delivery_id}</td>
              <td className="px-4 py-3 text-white">{d.ship_to_name}</td>
              <td className="px-4 py-3"><DeliveryStatusBadge status={d.status} /></td>
              <td className="px-4 py-3 text-muted-foreground">{d.planned_gi_date}</td>
              <td className="px-4 py-3 text-muted-foreground">{d.driver_name || '—'}</td>
              <td className="px-4 py-3">
                <Link href={`/dashboard/dispatch/${d.delivery_id}`} className="text-xs text-purple-400 hover:text-purple-300">View →</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 4: Create dispatcher dashboard page**

File: `frontend/nexera-dispatch/app/dashboard/dispatch/page.tsx`

```tsx
'use client';
import { useEffect, useState } from 'react';
import { Navbar } from '@/components/navbar';
import { KpiCard } from '@/components/kpi-card';
import { DeliveryTable } from '@/components/delivery-table';
import { getCurrentUser } from '@/lib/auth';
import { listDeliveries } from '@/lib/api';
import type { Delivery } from '@/lib/types';

export default function DispatchPage() {
  const user = getCurrentUser();
  const warehouseNumber = user?.warehouse_numbers?.[0] || '0001';
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    listDeliveries(warehouseNumber)
      .then(data => setDeliveries(Array.isArray(data) ? data : (data as { value?: Delivery[] }).value || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [warehouseNumber]);

  const open = deliveries.filter(d => d.status === 'Open').length;
  const inTransit = deliveries.filter(d => d.status === 'In Transit').length;
  const delayed = deliveries.filter(d => d.status === 'Delayed').length;
  const delivered = deliveries.filter(d => d.status === 'Delivered').length;

  return (
    <div className="min-h-screen">
      <Navbar
        warehouseLabel={`WH-${warehouseNumber}`}
        onAskAI={() => setChatOpen(true)}
      />
      <main className="max-w-6xl mx-auto px-6 py-6">
        <h1 className="text-xl font-bold text-white mb-6">Dispatcher Dashboard</h1>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <KpiCard label="Open" value={open} />
          <KpiCard label="In Transit" value={inTransit} highlight />
          <KpiCard label="Delayed" value={delayed} warning />
          <KpiCard label="Delivered" value={delivered} />
        </div>
        {loading ? (
          <p className="text-muted-foreground">Loading deliveries…</p>
        ) : (
          <DeliveryTable deliveries={deliveries} />
        )}
      </main>

      {/* AI Chat placeholder — wired up in Plan 3 */}
      {chatOpen && (
        <div className="fixed bottom-4 right-4 w-96 h-[520px] bg-card border border-border rounded-2xl shadow-2xl flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-sm font-semibold text-white">Ask NeXera AI</span>
            <button onClick={() => setChatOpen(false)} className="text-muted-foreground hover:text-white text-lg leading-none">×</button>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">AI chat coming in Plan 3</p>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/nexera-dispatch/components/ frontend/nexera-dispatch/app/dashboard/dispatch/page.tsx
git commit -m "feat: dispatcher dashboard with KPIs, delivery table, and AI chat placeholder"
```

---

## Task 8: Delivery detail — items, driver assign, QR code

**Files:**
- Create: `frontend/nexera-dispatch/components/driver-assign-form.tsx`
- Create: `frontend/nexera-dispatch/components/qr-display.tsx`
- Create: `frontend/nexera-dispatch/app/dashboard/dispatch/[deliveryId]/page.tsx`

- [ ] **Step 1: Create driver assign form**

File: `frontend/nexera-dispatch/components/driver-assign-form.tsx`

```tsx
'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { assignDriver } from '@/lib/api';
import { Loader2 } from 'lucide-react';

interface DriverAssignFormProps {
  deliveryId: string;
  onAssigned: (qrImage: string) => void;
}

export function DriverAssignForm({ deliveryId, onAssigned }: DriverAssignFormProps) {
  const [form, setForm] = useState({ name: '', mobile: '', truck: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await assignDriver(deliveryId, form.mobile, form.name, form.truck);
      onAssigned(res.QRCodeImage);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Assignment failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleAssign} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Driver name</Label>
          <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
        </div>
        <div className="space-y-1">
          <Label>Mobile number</Label>
          <Input value={form.mobile} onChange={e => setForm(f => ({ ...f, mobile: e.target.value }))} required placeholder="+49..." />
        </div>
      </div>
      <div className="space-y-1">
        <Label>Truck registration</Label>
        <Input value={form.truck} onChange={e => setForm(f => ({ ...f, truck: e.target.value }))} />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="bg-purple-600 hover:bg-purple-700" disabled={loading}>
        {loading ? <><Loader2 size={14} className="animate-spin mr-2" />Assigning…</> : 'Assign Driver & Generate QR'}
      </Button>
    </form>
  );
}
```

- [ ] **Step 2: Create QR display component**

File: `frontend/nexera-dispatch/components/qr-display.tsx`

```tsx
'use client';
import { Button } from '@/components/ui/button';
import { Copy } from 'lucide-react';

interface QrDisplayProps {
  qrImage: string;
  deliveryId: string;
}

export function QrDisplay({ qrImage, deliveryId }: QrDisplayProps) {
  function copyShareLink() {
    const url = `${window.location.origin}/driver/${deliveryId}`;
    navigator.clipboard.writeText(url);
  }

  return (
    <div className="flex flex-col items-center gap-4 p-4 rounded-xl border border-border bg-secondary/20">
      <p className="text-sm text-muted-foreground">Driver QR Code — share to confirm pickup</p>
      {/* QR is base64 data URI from cap-srv qrcode package */}
      <img src={qrImage} alt="Driver QR" className="w-40 h-40 rounded-lg" />
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={copyShareLink} className="gap-2">
          <Copy size={12} /> Copy link
        </Button>
        <Button variant="outline" size="sm" onClick={() => {
          const a = document.createElement('a');
          a.href = qrImage;
          a.download = `qr-${deliveryId}.png`;
          a.click();
        }}>
          Download
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create delivery detail page**

File: `frontend/nexera-dispatch/app/dashboard/dispatch/[deliveryId]/page.tsx`

```tsx
'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Navbar } from '@/components/navbar';
import { DeliveryStatusBadge } from '@/components/delivery-status-badge';
import { DriverAssignForm } from '@/components/driver-assign-form';
import { QrDisplay } from '@/components/qr-display';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getDelivery, getDeliveryItems } from '@/lib/api';
import type { Delivery, DeliveryItem } from '@/lib/types';
import { ArrowLeft, Mail, Phone } from 'lucide-react';

export default function DeliveryDetailPage() {
  const params = useParams<{ deliveryId: string }>();
  const router = useRouter();
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [items, setItems] = useState<DeliveryItem[]>([]);
  const [qrImage, setQrImage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getDelivery(params.deliveryId),
      getDeliveryItems(params.deliveryId).catch(() => []),
    ]).then(([d, it]) => {
      setDelivery(d);
      setItems(Array.isArray(it) ? it : (it as { value?: DeliveryItem[] }).value || []);
    }).finally(() => setLoading(false));
  }, [params.deliveryId]);

  if (loading) return <div className="min-h-screen"><Navbar /><main className="p-8"><p className="text-muted-foreground">Loading…</p></main></div>;
  if (!delivery) return <div className="min-h-screen"><Navbar /><main className="p-8"><p className="text-muted-foreground">Delivery not found.</p></main></div>;

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-4xl mx-auto px-6 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft size={18} /></Button>
          <h1 className="text-xl font-bold text-white font-mono">{delivery.delivery_id}</h1>
          <DeliveryStatusBadge status={delivery.status} />
        </div>

        {/* Delivery info */}
        <Card>
          <CardHeader><CardTitle className="text-base">Delivery Details</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              {[
                ['Ship-To', delivery.ship_to_name],
                ['Address', delivery.ship_to_address],
                ['Planned GI Date', delivery.planned_gi_date],
                ['Shipping Point', delivery.shipping_point],
                ['Route', delivery.route],
                ['Weight', delivery.weight_kg ? `${delivery.weight_kg} kg` : '—'],
                ['Source ERP', delivery.source_erp],
                ['Warehouse', delivery.warehouse_number],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-muted-foreground mb-0.5">{label}</p>
                  <p className="text-white">{value || '—'}</p>
                </div>
              ))}
            </div>
            {(delivery.ship_to_email || delivery.ship_to_mobile) && (
              <div className="mt-4 pt-4 border-t border-border flex gap-4 text-sm">
                {delivery.ship_to_email && (
                  <a href={`mailto:${delivery.ship_to_email}`} className="flex items-center gap-1.5 text-purple-400 hover:underline">
                    <Mail size={13} />{delivery.ship_to_email}
                  </a>
                )}
                {delivery.ship_to_mobile && (
                  <a href={`tel:${delivery.ship_to_mobile}`} className="flex items-center gap-1.5 text-purple-400 hover:underline">
                    <Phone size={13} />{delivery.ship_to_mobile}
                  </a>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Items */}
        {items.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Delivery Items</CardTitle></CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead><tr className="text-muted-foreground border-b border-border">
                  <th className="text-left pb-2">Item</th>
                  <th className="text-left pb-2">Material</th>
                  <th className="text-right pb-2">Qty</th>
                  <th className="text-right pb-2">Unit</th>
                </tr></thead>
                <tbody>{items.map(item => (
                  <tr key={item.id} className="border-b border-border last:border-0">
                    <td className="py-2 font-mono text-muted-foreground">{item.item_no}</td>
                    <td className="py-2 text-white">{item.material}</td>
                    <td className="py-2 text-right text-white">{item.qty}</td>
                    <td className="py-2 text-right text-muted-foreground">{item.unit}</td>
                  </tr>
                ))}</tbody>
              </table>
            </CardContent>
          </Card>
        )}

        {/* Driver assignment */}
        <Card>
          <CardHeader><CardTitle className="text-base">Driver Assignment</CardTitle></CardHeader>
          <CardContent>
            {delivery.driver_name ? (
              <div className="text-sm space-y-1">
                <p className="text-muted-foreground">Assigned driver</p>
                <p className="text-white font-medium">{delivery.driver_name} · {delivery.driver_mobile}</p>
              </div>
            ) : (
              <DriverAssignForm deliveryId={delivery.delivery_id} onAssigned={setQrImage} />
            )}
          </CardContent>
        </Card>

        {/* QR code */}
        {qrImage && <QrDisplay qrImage={qrImage} deliveryId={delivery.delivery_id} />}
      </main>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/nexera-dispatch/components/driver-assign-form.tsx \
         frontend/nexera-dispatch/components/qr-display.tsx \
         frontend/nexera-dispatch/app/dashboard/dispatch/
git commit -m "feat: delivery detail page with driver assign form and QR code display"
```

---

## Task 9: WH Manager warehouse profile setup

**Files:**
- Create: `frontend/nexera-dispatch/app/dashboard/warehouse/page.tsx`
- Create: `frontend/nexera-dispatch/app/dashboard/warehouse/profile/page.tsx`

- [ ] **Step 1: Create WH Manager home**

File: `frontend/nexera-dispatch/app/dashboard/warehouse/page.tsx`

```tsx
'use client';
import { useState } from 'react';
import { Navbar } from '@/components/navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { createInvite } from '@/lib/api';
import { Copy } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';

export default function WarehousePage() {
  const user = getCurrentUser();
  const warehouseNumber = user?.warehouse_numbers?.[0] || '0001';
  const [email, setEmail] = useState('');
  const [inviteUrl, setInviteUrl] = useState('');
  const [error, setError] = useState('');

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const res = await createInvite(email, 'dispatcher', warehouseNumber);
      setInviteUrl(res.invite_url);
      setEmail('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create invite');
    }
  }

  return (
    <div className="min-h-screen">
      <Navbar warehouseLabel={`WH-${warehouseNumber}`} />
      <main className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Warehouse {warehouseNumber}</h1>
          <Button asChild variant="outline">
            <Link href="/dashboard/warehouse/profile">Edit Profile</Link>
          </Button>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Invite Dispatcher</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleInvite} className="space-y-3">
              <div className="space-y-1">
                <Label>Dispatcher email</Label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="dispatcher@company.com" />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="bg-purple-600 hover:bg-purple-700">Generate Invite Link</Button>
            </form>
            {inviteUrl && (
              <div className="mt-4 flex items-center gap-2">
                <Input value={inviteUrl} readOnly className="text-xs" />
                <Button size="icon" variant="ghost" onClick={() => navigator.clipboard.writeText(inviteUrl)}><Copy size={14} /></Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Create warehouse profile setup page**

File: `frontend/nexera-dispatch/app/dashboard/warehouse/profile/page.tsx`

```tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getCurrentUser } from '@/lib/auth';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function WarehouseProfilePage() {
  const router = useRouter();
  const user = getCurrentUser();
  const warehouseNumber = user?.warehouse_numbers?.[0] || '0001';
  const [form, setForm] = useState({
    physical_address: '', city: '', country: '', postal_code: '',
    latitude: '', longitude: '',
    working_hours_start: '08:00', working_hours_end: '17:00',
  });
  const [workingDays, setWorkingDays] = useState<string[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  function set(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [field]: e.target.value }));
  }

  function toggleDay(day: string) {
    setWorkingDays(d => d.includes(day) ? d.filter(x => x !== day) : [...d, day]);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    // POST to cap-srv warehouse profile endpoint (wired in Plan 1 post-hackathon, stubbed here)
    // For hackathon: store in localStorage as placeholder
    try {
      localStorage.setItem(`nexera_wh_profile_${warehouseNumber}`, JSON.stringify({
        ...form,
        working_days: workingDays.join(','),
      }));
      setSaved(true);
      setTimeout(() => router.push('/dashboard/warehouse'), 1000);
    } catch {
      setError('Failed to save profile');
    }
  }

  return (
    <div className="min-h-screen">
      <Navbar warehouseLabel={`WH-${warehouseNumber}`} />
      <main className="max-w-2xl mx-auto px-6 py-8">
        <h1 className="text-xl font-bold text-white mb-6">Warehouse Profile</h1>
        <form onSubmit={handleSave} className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Physical Address</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1"><Label>Street address</Label><Input value={form.physical_address} onChange={set('physical_address')} required /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>City</Label><Input value={form.city} onChange={set('city')} required /></div>
                <div className="space-y-1"><Label>Postal code</Label><Input value={form.postal_code} onChange={set('postal_code')} /></div>
              </div>
              <div className="space-y-1"><Label>Country</Label><Input value={form.country} onChange={set('country')} required /></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Map Coordinates (route origin)</CardTitle></CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-3">Used as the starting point for all Google Maps route calculations and driver QR pages.</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Latitude</Label><Input type="number" step="any" value={form.latitude} onChange={set('latitude')} placeholder="53.5753" /></div>
                <div className="space-y-1"><Label>Longitude</Label><Input type="number" step="any" value={form.longitude} onChange={set('longitude')} placeholder="10.0153" /></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Working Hours</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Start time</Label><Input type="time" value={form.working_hours_start} onChange={set('working_hours_start')} /></div>
                <div className="space-y-1"><Label>End time</Label><Input type="time" value={form.working_hours_end} onChange={set('working_hours_end')} /></div>
              </div>
              <div>
                <Label className="mb-2 block">Working days</Label>
                <div className="flex gap-2">
                  {DAYS.map(day => (
                    <button key={day} type="button" onClick={() => toggleDay(day)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${workingDays.includes(day) ? 'bg-purple-600 border-purple-500 text-white' : 'bg-secondary border-border text-muted-foreground'}`}>
                      {day}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {error && <p className="text-sm text-destructive">{error}</p>}
          {saved && <p className="text-sm text-green-400">Profile saved!</p>}
          <Button type="submit" className="bg-purple-600 hover:bg-purple-700 w-full">Save Profile</Button>
        </form>
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/nexera-dispatch/app/dashboard/warehouse/
git commit -m "feat: WH Manager dashboard with dispatcher invite and warehouse profile setup"
```

---

## Task 10: Deploy frontend to Vercel

**Files:**
- No file changes — deployment step

- [ ] **Step 1: Push to GitHub**

```bash
git push origin main
```

- [ ] **Step 2: Import project on Vercel**

1. Go to https://vercel.com/new
2. Import the GitHub repo `NeXera-AI-Labs/Dispatch-Agents-GCP`
3. Set **Root Directory** to `frontend/nexera-dispatch`
4. Add environment variables:
   - `NEXT_PUBLIC_CAP_URL` = `https://cap-srv-1069189829983.us-central1.run.app`
   - `NEXT_PUBLIC_AGENTS_URL` = your agents Cloud Run URL
5. Deploy

- [ ] **Step 3: Update cap-srv APP_BASE_URL**

Once you have the Vercel URL (e.g. `https://nexera-dispatch.vercel.app`), update cap-srv:

```bash
gcloud run services update cap-srv \
  --region us-central1 \
  --update-env-vars "APP_BASE_URL=https://nexera-dispatch.vercel.app" \
  --project agentic-dispatch
```

- [ ] **Step 4: End-to-end smoke test**

Visit your Vercel URL and run through this flow:
1. `/signup` — create company + IT Admin account → lands on `/dashboard/admin`
2. `/dashboard/admin/wizard` — add SAP connection → complete 4 steps → see warehouse list
3. Copy invite URL → open in new tab → `/invite?token=...` → create dispatcher account
4. Login as dispatcher → `/dashboard/dispatch` → see delivery list
5. Click a delivery → assign driver → see QR code
6. Test "Ask AI" button → chat panel opens

- [ ] **Step 5: Commit deployment note**

```bash
git commit --allow-empty -m "chore: deploy Next.js frontend to Vercel"
```
