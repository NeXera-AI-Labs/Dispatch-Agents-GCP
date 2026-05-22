import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getDb } from '@/lib/db';
import { getTokenFromRequest } from '@/lib/auth-helpers';

const APP_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function POST(request: Request) {
  const caller = getTokenFromRequest(request);
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { email, role, warehouse_number } = await request.json();
  if (!email || !role) return NextResponse.json({ error: 'email and role required' }, { status: 400 });

  const allowed: Record<string, string[]> = { it_admin: ['wh_manager'], wh_manager: ['dispatcher', 'supervisor'] };
  if (!allowed[caller.role]?.includes(role)) {
    return NextResponse.json({ error: `${caller.role} cannot invite ${role}` }, { status: 403 });
  }

  const token = randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 86400000).toISOString();

  const db = getDb();
  await db.query(
    'INSERT INTO invites (tenant_id, email, role, warehouse_number, token, expires_at, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7)',
    [caller.tenant_id, email, role, warehouse_number || null, token, expiresAt, caller.user_id]
  );

  return NextResponse.json({ invite_url: `${APP_BASE_URL}/invite?token=${token}`, token });
}
