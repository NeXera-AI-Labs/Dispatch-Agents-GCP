import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getDb } from '@/lib/db';
import { getTokenFromRequest } from '@/lib/auth-helpers';

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
  try {
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
  } catch (e: unknown) {
    console.error('POST /api/connections error:', e);
    const msg = e instanceof Error ? e.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
