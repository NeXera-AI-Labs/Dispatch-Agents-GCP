import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyPassword, signToken } from '@/lib/auth-helpers';

export async function POST(request: Request) {
  const { email, password } = await request.json();
  if (!email || !password) {
    return NextResponse.json({ error: 'email and password required' }, { status: 400 });
  }

  const db = getDb();
  const res = await db.query('SELECT * FROM users WHERE email = $1', [email]);
  const user = res.rows[0];
  if (!user) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });

  const match = await verifyPassword(password, user.password_hash);
  if (!match) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });

  const whRes = await db.query(
    'SELECT warehouse_number FROM user_warehouses WHERE user_id = $1 AND tenant_id = $2',
    [user.id, user.tenant_id]
  );
  const warehouse_numbers = whRes.rows.map((r: { warehouse_number: string }) => r.warehouse_number);

  const token = signToken({ user_id: user.id, tenant_id: user.tenant_id, email: user.email, role: user.role, warehouse_numbers });
  return NextResponse.json({ token, tenant_id: user.tenant_id, user_id: user.id, role: user.role, warehouse_numbers });
}
