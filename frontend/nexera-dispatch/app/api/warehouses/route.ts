import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getTokenFromRequest } from '@/lib/auth-helpers';

export async function GET(request: Request) {
  const caller = getTokenFromRequest(request);
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDb();
  const res = await db.query(
    'SELECT id, warehouse_number, name, connection_id, physical_address, city, country FROM warehouses WHERE tenant_id = $1 ORDER BY warehouse_number',
    [caller.tenant_id]
  );
  return NextResponse.json(res.rows);
}
