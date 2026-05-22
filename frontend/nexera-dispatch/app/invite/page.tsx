'use client';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { getInvite, acceptInvite } from '@/lib/api';
import { setToken } from '@/lib/auth';
import type { InviteDetails } from '@/lib/types';

function InviteForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token') || '';
  const [invite, setInvite] = useState<InviteDetails | null>(null);
  const [form, setForm] = useState({ full_name: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    getInvite(token).then(setInvite).catch(() =>
      setInvite({ valid: false, email: '', role: '', warehouse_number: '', tenant_id: '' })
    );
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await acceptInvite(token, form.full_name, form.password);
      setToken(res.token);
      router.push('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to accept invite');
    } finally {
      setLoading(false);
    }
  }

  if (!invite) return <p className="text-muted-foreground">Loading invite…</p>;

  if (!invite.valid) return (
    <Card className="w-full max-w-sm">
      <CardHeader><CardTitle>Invite invalid or expired</CardTitle></CardHeader>
      <CardContent><p className="text-muted-foreground text-sm">This invite link is no longer valid. Ask your administrator to resend it.</p></CardContent>
    </Card>
  );

  const roleLabel: Record<string, string> = { wh_manager: 'Warehouse Manager', dispatcher: 'Dispatcher', supervisor: 'Supervisor' };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>You&apos;re invited</CardTitle>
        <CardDescription>
          Join as <strong>{roleLabel[invite.role] || invite.role}</strong>
          {invite.warehouse_number && ` — Warehouse ${invite.warehouse_number}`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">Invited email: <strong>{invite.email}</strong></p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label>Your name</Label>
            <Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} required autoFocus />
          </div>
          <div className="space-y-1">
            <Label>Set password</Label>
            <Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required minLength={8} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700" disabled={loading}>
            {loading ? 'Setting up account…' : 'Accept & get started'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function InvitePage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
        <InviteForm />
      </Suspense>
    </main>
  );
}
