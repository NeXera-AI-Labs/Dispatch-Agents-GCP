import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(request: Request) {
  const { token } = await request.json();
  const db = getDb();
  const res = await db.query('SELECT * FROM invites WHERE token = $1', [token]);
  const invite = res.rows[0];

  if (!invite) return NextResponse.json({ valid: false, email: '', role: '', warehouse_number: '', tenant_id: '' });
  if (invite.used_at) return NextResponse.json({ valid: false, email: invite.email, role: '', warehouse_number: '', tenant_id: '' });
  if (new Date(invite.expires_at) < new Date()) return NextResponse.json({ valid: false, email: invite.email, role: '', warehouse_number: '', tenant_id: '' });

  return NextResponse.json({
    valid: true,
    email: invite.email,
    role: invite.role,
    warehouse_number: invite.warehouse_number || '',
    tenant_id: invite.tenant_id,
  });
}
