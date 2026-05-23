import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getTokenFromRequest } from '@/lib/auth-helpers';

// Gemini auth uses ADC on Cloud Run (the agents service account has roles/aiplatform.user).
// Org policy disallows API keys for Vertex, so there is no gemini_api_key field here.

export async function GET(request: Request) {
  const caller = getTokenFromRequest(request);
  if (!caller || caller.role !== 'it_admin') return NextResponse.json({ error: 'IT Admin only' }, { status: 403 });

  const db = getDb();
  const res = await db.query(
    'SELECT teams_webhook_url, google_maps_key FROM tenant_settings WHERE tenant_id = $1',
    [caller.tenant_id]
  );
  return NextResponse.json(res.rows[0] ?? { teams_webhook_url: '', google_maps_key: '' });
}

export async function POST(request: Request) {
  const caller = getTokenFromRequest(request);
  if (!caller || caller.role !== 'it_admin') return NextResponse.json({ error: 'IT Admin only' }, { status: 403 });

  const { teams_webhook_url, google_maps_key } = await request.json();
  const db = getDb();
  await db.query(
    `INSERT INTO tenant_settings (tenant_id, teams_webhook_url, google_maps_key, updated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (tenant_id) DO UPDATE SET
       teams_webhook_url = EXCLUDED.teams_webhook_url,
       google_maps_key   = EXCLUDED.google_maps_key,
       updated_at        = NOW()`,
    [caller.tenant_id, teams_webhook_url || null, google_maps_key || null]
  );
  return NextResponse.json({ success: true });
}
