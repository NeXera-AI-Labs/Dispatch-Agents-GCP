import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { hashPassword, signToken } from '@/lib/auth-helpers';

export async function POST(request: Request) {
  const { token, full_name, password } = await request.json();
  if (!token || !password) return NextResponse.json({ error: 'token and password required' }, { status: 400 });

  const db = getDb();
  const invRes = await db.query('SELECT * FROM invites WHERE token = $1', [token]);
  const invite = invRes.rows[0];

  if (!invite || invite.used_at || new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Invalid or expired invite' }, { status: 400 });
  }

  const existing = await db.query('SELECT id FROM users WHERE email = $1', [invite.email]);
  if (existing.rows.length > 0) return NextResponse.json({ error: 'Email already registered' }, { status: 409 });

  const hash = await hashPassword(password);
  const userRes = await db.query(
    'INSERT INTO users (tenant_id, email, password_hash, full_name, role) VALUES ($1,$2,$3,$4,$5) RETURNING id',
    [invite.tenant_id, invite.email, hash, full_name || invite.email, invite.role]
  );
  const userId = userRes.rows[0].id;

  if (invite.warehouse_number) {
    await db.query(
      'INSERT INTO user_warehouses (user_id, warehouse_number, tenant_id, role) VALUES ($1,$2,$3,$4)',
      [userId, invite.warehouse_number, invite.tenant_id, invite.role]
    );
  }

  await db.query('UPDATE invites SET used_at = NOW() WHERE token = $1', [token]);

  const warehouse_numbers = invite.warehouse_number ? [invite.warehouse_number] : [];
  const jwtToken = signToken({ user_id: userId, tenant_id: invite.tenant_id, email: invite.email, role: invite.role, warehouse_numbers });
  return NextResponse.json({ token: jwtToken, tenant_id: invite.tenant_id, user_id: userId, role: invite.role });
}
