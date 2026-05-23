import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getTokenFromRequest } from '@/lib/auth-helpers';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const caller = getTokenFromRequest(request);
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await context.params;
  const db = getDb();
  const r = await db.query(
    `SELECT raw_json FROM delivery_items
     WHERE tenant_id = $1 AND delivery_document = $2
     ORDER BY delivery_document_item ASC`,
    [caller.tenant_id, id]
  );
  return NextResponse.json(r.rows.map(row => row.raw_json));
}
