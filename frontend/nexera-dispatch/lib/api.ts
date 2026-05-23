import { getToken } from './auth';
import type { AuthResponse, InviteDetails, Connection, Warehouse, Delivery, DeliveryItem, TenantSettings, RouteDirections, DriverAssignment } from './types';


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

// cap-srv calls go through /api/cap proxy to avoid CORS
async function capGet<T>(path: string): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`/api/cap${path}`, { headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || data.message || 'Request failed');
  return (data.value ?? data) as T;
}

async function capPost<T>(path: string, body: unknown): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`/api/cap${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
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

// SAP sandbox data has no WarehouseNumber field — fetch all, $top=100
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const listDeliveries = (_warehouse_number: string) =>
  capGet<Delivery[]>(`/odata/v4/ewm/OutboundDeliveries?$top=100`);

export const getDelivery = (deliveryId: string) =>
  capGet<Delivery>(`/odata/v4/ewm/OutboundDeliveries('${deliveryId}')`);

export const getDeliveryItems = (deliveryDoc: string) =>
  capPost<DeliveryItem[]>('/odata/v4/ewm/getDeliveryItems', { deliveryDoc });

export const assignDriver = (deliveryDoc: string, mobileNumber: string, driverName: string, truckRegistration: string) =>
  capPost<{ QRCodeImage: string; QRCodeUrl: string; ID: string }>('/odata/v4/tracking/assignDriver', { deliveryDoc, mobileNumber, driverName, truckRegistration });

export const getDirections = (from: string, to: string) =>
  capPost<RouteDirections>('/odata/v4/gmaps/getDirections', { from, to });

export const getAssignment = (assignmentId: string) =>
  capGet<DriverAssignment>(`/odata/v4/tracking/getAssignment(assignmentId='${assignmentId}')`);

export const listAssignments = () =>
  capGet<{ value: DriverAssignment[] }>(`/odata/v4/tracking/DriverAssignment?$top=200`)
    .then(r => r.value ?? []);

// Latest active (or most recent) assignment for a given delivery document.
// Used by the detail page to decide whether to show the assign form or the existing driver card.
export const getAssignmentByDelivery = (deliveryDoc: string) =>
  listAssignments().then(list => {
    const matches = list
      .filter(a => a.DeliveryDocument === deliveryDoc)
      .sort((a, b) => (b.AssignedAt ?? '').localeCompare(a.AssignedAt ?? ''));
    return matches[0] ?? null;
  });

// ── Warehouses ────────────────────────────────────────────────────────

export const listWarehouses = () =>
  apiGet<Warehouse[]>('/api/warehouses', true);

// ── Tenant Settings ───────────────────────────────────────────────────

export const getSettings = () =>
  apiGet<TenantSettings>('/api/settings', true);

export const saveSettings = (data: TenantSettings) =>
  apiPost<{ success: boolean }>('/api/settings', data, true);

// ── AI Chat ───────────────────────────────────────────────────────────

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  toolSteps?: string[];
}

export interface ChatApiResponse {
  reply: string;
  pending_action: { description: string; action: string } | null;
}

export async function sendChat(
  threadId: string,
  message: string,
  warehouseNumber: string,
  confirm?: boolean
): Promise<ChatApiResponse> {
  const token = getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const body: Record<string, unknown> = { thread_id: threadId, message, warehouse_number: warehouseNumber };
  if (confirm !== undefined) body['confirm'] = confirm;

  // Route through Next.js proxy to avoid CORS and keep agents URL server-side
  const res = await fetch('/api/agents/chat', { method: 'POST', headers, body: JSON.stringify(body) });
  const text = await res.text();
  if (!res.ok) {
    let msg = text;
    try { const d = JSON.parse(text); msg = d.detail || d.message || text; } catch { /* plain text */ }
    throw new Error(msg || 'Chat request failed');
  }
  return JSON.parse(text);
}
