import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getDb } from '@/lib/db';
import { getTokenFromRequest } from '@/lib/auth-helpers';

const APP_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const caller = getTokenFromRequest(request);
  if (!caller || caller.role !== 'it_admin') return NextResponse.json({ error: 'IT Admin only' }, { status: 403 });

  const { warehouse_number, manager_email } = await request.json();
  if (!warehouse_number || !manager_email) {
    return NextResponse.json({ error: 'warehouse_number and manager_email required' }, { status: 400 });
  }

  const token = randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 86400000).toISOString();

  const db = getDb();
  await db.query(
    'INSERT INTO invites (tenant_id, email, role, warehouse_number, token, expires_at, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7)',
    [caller.tenant_id, manager_email, 'wh_manager', warehouse_number, token, expiresAt, caller.user_id]
  );

  // params is awaited to satisfy Next.js 15 dynamic route typing; id is available but not used here
  await params;

  return NextResponse.json({ invite_url: `${APP_BASE_URL}/invite?token=${token}` });
}
