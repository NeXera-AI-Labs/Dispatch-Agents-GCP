'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Settings, UserPlus, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getCurrentUser } from '@/lib/auth';
import { Navbar } from '@/components/navbar';
import { createInvite } from '@/lib/api';

export default function WarehousePage() {
  const user = getCurrentUser();
  const warehouseNumber = user?.warehouse_numbers?.[0] ?? '0001';
  const [dispatcherEmail, setDispatcherEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [inviteError, setInviteError] = useState('');

  async function handleInviteDispatcher() {
    if (!dispatcherEmail) return;
    setInviting(true);
    setInviteError('');
    setInviteLink('');
    try {
      const { invite_url } = await createInvite(dispatcherEmail, 'dispatcher', warehouseNumber);
      setInviteLink(invite_url);
      setDispatcherEmail('');
    } catch (e: unknown) {
      setInviteError(e instanceof Error ? e.message : 'Failed to create invite');
    } finally {
      setInviting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar warehouseNumber={warehouseNumber} />
      <main className="max-w-2xl mx-auto px-6 py-10 space-y-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Warehouse {warehouseNumber}</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage your warehouse and team</p>
          </div>
          <Link href="/dashboard/warehouse/profile" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-muted text-foreground text-sm font-medium transition-colors">
            <Settings size={14} />
            Edit Profile
          </Link>
        </div>

        {/* Invite Dispatcher */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <UserPlus size={16} className="text-indigo-400" />
            <h2 className="text-sm font-semibold text-foreground">Invite Dispatcher</h2>
          </div>
          <div className="flex gap-3">
            <Input
              type="email"
              placeholder="dispatcher@company.com"
              value={dispatcherEmail}
              onChange={(e) => setDispatcherEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleInviteDispatcher()}
            />
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 flex-shrink-0"
              onClick={handleInviteDispatcher}
              disabled={inviting || !dispatcherEmail}
            >
              {inviting ? <Loader2 size={14} className="animate-spin" /> : 'Send Invite'}
            </Button>
          </div>
          {inviteError && <p className="text-xs text-red-400">{inviteError}</p>}
          {inviteLink && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-green-400">
                <CheckCircle2 size={12} /> Invite created!
              </div>
              <div className="bg-secondary rounded-lg p-3 text-xs text-muted-foreground break-all font-mono">{inviteLink}</div>
              <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(inviteLink)}>
                Copy Link
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
