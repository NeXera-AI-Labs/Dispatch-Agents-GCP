import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { hashPassword, signToken } from '@/lib/auth-helpers';

export async function POST(request: Request) {
  const { company_name, email, password, full_name } = await request.json();
  if (!company_name || !email || !password) {
    return NextResponse.json({ error: 'company_name, email and password required' }, { status: 400 });
  }

  const db = getDb();
  const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length > 0) {
    return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
  }

  const tenantRes = await db.query(
    'INSERT INTO tenants (name, plan_type) VALUES ($1, $2) RETURNING id',
    [company_name, 'trial']
  );
  const tenantId = tenantRes.rows[0].id;

  const hash = await hashPassword(password);
  const userRes = await db.query(
    'INSERT INTO users (tenant_id, email, password_hash, full_name, role) VALUES ($1,$2,$3,$4,$5) RETURNING id',
    [tenantId, email, hash, full_name || email, 'it_admin']
  );
  const userId = userRes.rows[0].id;

  const token = signToken({ user_id: userId, tenant_id: tenantId, email, role: 'it_admin', warehouse_numbers: [] });
  return NextResponse.json({ token, tenant_id: tenantId, user_id: userId, role: 'it_admin' });
}
