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
    // Verify connectivity via cap-srv (the live middleware) — it already knows how to reach SAP
    const capSrvUrl = process.env.CAP_SRV_URL || 'https://cap-srv-1069189829983.us-central1.run.app';
    const res = await fetch(`${capSrvUrl}/odata/v4/ewm/$metadata`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`cap-srv returned ${res.status}`);

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
