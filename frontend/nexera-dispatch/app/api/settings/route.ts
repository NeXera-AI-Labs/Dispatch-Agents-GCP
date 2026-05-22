import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getTokenFromRequest } from '@/lib/auth-helpers';

export async function GET(request: Request) {
  const caller = getTokenFromRequest(request);
  if (!caller || caller.role !== 'it_admin') return NextResponse.json({ error: 'IT Admin only' }, { status: 403 });

  const db = getDb();
  const res = await db.query(
    'SELECT gemini_api_key, teams_webhook_url, google_maps_key FROM tenant_settings WHERE tenant_id = $1',
    [caller.tenant_id]
  );
  return NextResponse.json(res.rows[0] ?? { gemini_api_key: '', teams_webhook_url: '', google_maps_key: '' });
}

export async function POST(request: Request) {
  const caller = getTokenFromRequest(request);
  if (!caller || caller.role !== 'it_admin') return NextResponse.json({ error: 'IT Admin only' }, { status: 403 });

  const { gemini_api_key, teams_webhook_url, google_maps_key } = await request.json();
  const db = getDb();
  await db.query(
    `INSERT INTO tenant_settings (tenant_id, gemini_api_key, teams_webhook_url, google_maps_key, updated_at)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (tenant_id) DO UPDATE SET
       gemini_api_key = EXCLUDED.gemini_api_key,
       teams_webhook_url = EXCLUDED.teams_webhook_url,
       google_maps_key = EXCLUDED.google_maps_key,
       updated_at = NOW()`,
    [caller.tenant_id, gemini_api_key || null, teams_webhook_url || null, google_maps_key || null]
  );
  return NextResponse.json({ success: true });
}
