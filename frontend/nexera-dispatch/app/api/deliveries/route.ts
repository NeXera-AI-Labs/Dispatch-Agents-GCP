import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getTokenFromRequest } from '@/lib/auth-helpers';

export async function GET(request: Request) {
  const caller = getTokenFromRequest(request);
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(request.url);
  const id = url.searchParams.get('id');

  const db = getDb();
  if (id) {
    const r = await db.query(
      'SELECT raw_json FROM deliveries WHERE tenant_id = $1 AND delivery_document = $2',
      [caller.tenant_id, id]
    );
    if (!r.rows[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(r.rows[0].raw_json);
  }

  const r = await db.query(
    `SELECT raw_json FROM deliveries
     WHERE tenant_id = $1
     ORDER BY delivery_date DESC NULLS LAST, delivery_document DESC
     LIMIT 200`,
    [caller.tenant_id]
  );
  return NextResponse.json(r.rows.map(row => row.raw_json));
}
