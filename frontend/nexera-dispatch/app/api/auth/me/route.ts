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
