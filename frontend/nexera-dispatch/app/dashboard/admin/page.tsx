'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, CheckCircle2, AlertCircle, Clock, Save, Loader2, ExternalLink } from 'lucide-react';
import { listConnections, getSettings, saveSettings, listWarehouses, createInvite } from '@/lib/api';
import type { Connection, TenantSettings, Warehouse } from '@/lib/types';
import { Navbar } from '@/components/navbar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

type Tab = 'connections' | 'settings' | 'team';

function statusIcon(status: string) {
  if (status === 'active') return <CheckCircle2 size={14} className="text-green-400" />;
  if (status === 'error') return <AlertCircle size={14} className="text-red-400" />;
  return <Clock size={14} className="text-yellow-400" />;
}

function MaskedInput({ label, id, value, onChange, placeholder, helpUrl, helpText }: {
  label: string; id: string; value: string; onChange: (v: string) => void;
  placeholder?: string; helpUrl?: string; helpText?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor={id}>{label}</Label>
        {helpUrl && (
          <a href={helpUrl} target="_blank" rel="noopener noreferrer"
            className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
            Get key <ExternalLink size={11} />
          </a>
        )}
      </div>
      <div className="relative">
        <Input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="pr-16"
        />
        <button type="button" onClick={() => setShow(v => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground">
          {show ? 'Hide' : 'Show'}
        </button>
      </div>
      {helpText && <p className="text-xs text-muted-foreground">{helpText}</p>}
    </div>
  );
}

// ── Connections tab ───────────────────────────────────────────────────

function ConnectionsTab() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listConnections().then(setConnections).catch(console.error).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-muted-foreground">Connect your SAP or other ERP systems to NeXera Dispatch.</p>
        <Link href="/dashboard/admin/wizard"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors">
          <Plus size={15} /> Add Connection
        </Link>
      </div>
      {loading ? (
        <div className="text-muted-foreground text-sm">Loading…</div>
      ) : connections.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl p-12 text-center">
          <p className="text-muted-foreground text-sm mb-4">No ERP connections yet.</p>
          <Link href="/dashboard/admin/wizard"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-muted text-foreground text-sm font-medium transition-colors">
            Add your first connection
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {connections.map(conn => (
            <div key={conn.id} className="bg-card border border-border rounded-xl px-5 py-4 flex items-center gap-4">
              {statusIcon(conn.status)}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-foreground">{conn.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{conn.erp_type} · {conn.base_url}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Settings tab ──────────────────────────────────────────────────────

function SettingsTab() {
  const [settings, setSettings] = useState<TenantSettings>({ gemini_api_key: '', teams_webhook_url: '', google_maps_key: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getSettings().then(s => setSettings({
      gemini_api_key: s.gemini_api_key ?? '',
      teams_webhook_url: s.teams_webhook_url ?? '',
      google_maps_key: s.google_maps_key ?? '',
    })).catch(console.error).finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true); setSaved(false); setError('');
    try {
      await saveSettings(settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally { setSaving(false); }
  }

  if (loading) return <div className="text-muted-foreground text-sm">Loading…</div>;

  return (
    <div className="space-y-8 max-w-xl">
      {/* AI */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-1">AI — Gemini</h3>
        <p className="text-xs text-muted-foreground mb-4">Powers the AI dispatch assistant. Each customer uses their own key.</p>
        <MaskedInput
          label="Gemini API Key"
          id="gemini-key"
          value={settings.gemini_api_key ?? ''}
          onChange={v => setSettings(s => ({ ...s, gemini_api_key: v }))}
          placeholder="AIza..."
          helpUrl="https://aistudio.google.com/app/apikey"
          helpText="Get a free key from Google AI Studio. Used for AI chat and dispatch agent."
        />
      </div>

      <div className="border-t border-border/50" />

      {/* Notifications */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-1">Notifications — Microsoft Teams</h3>
        <p className="text-xs text-muted-foreground mb-4">Receive dispatch alerts and driver assignment notifications in your Teams channel.</p>
        <MaskedInput
          label="Teams Incoming Webhook URL"
          id="teams-webhook"
          value={settings.teams_webhook_url ?? ''}
          onChange={v => setSettings(s => ({ ...s, teams_webhook_url: v }))}
          placeholder="https://yourorg.webhook.office.com/webhookb2/..."
          helpUrl="https://learn.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/how-to/add-incoming-webhook"
          helpText="In Teams: channel → Connectors → Incoming Webhook. Paste the generated URL here."
        />
      </div>

      <div className="border-t border-border/50" />

      {/* Maps */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-1">Maps — Google Maps</h3>
        <p className="text-xs text-muted-foreground mb-4">Used to display delivery routes and driver locations on the map view.</p>
        <MaskedInput
          label="Google Maps API Key"
          id="maps-key"
          value={settings.google_maps_key ?? ''}
          onChange={v => setSettings(s => ({ ...s, google_maps_key: v }))}
          placeholder="AIza..."
          helpUrl="https://console.cloud.google.com/apis/credentials"
          helpText="Enable Maps JavaScript API in GCP Console, then create an API key under Credentials."
        />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <Button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 gap-2">
        {saving ? <><Loader2 size={14} className="animate-spin" />Saving…</> : saved ? <><CheckCircle2 size={14} />Saved</> : <><Save size={14} />Save Settings</>}
      </Button>
    </div>
  );
}

// ── Team tab ──────────────────────────────────────────────────────────

function TeamTab() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWh, setSelectedWh] = useState('');
  const [email, setEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteUrl, setInviteUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    listWarehouses().then(w => {
      setWarehouses(w);
      if (w.length > 0) setSelectedWh(w[0].warehouse_number);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  async function handleInvite() {
    if (!email || !selectedWh) return;
    setInviting(true); setError(''); setInviteUrl('');
    try {
      const res = await createInvite(email, 'wh_manager', selectedWh);
      setInviteUrl(res.invite_url);
      setEmail('');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create invite');
    } finally { setInviting(false); }
  }

  function copyLink() {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) return <div className="text-muted-foreground text-sm">Loading…</div>;

  return (
    <div className="max-w-xl space-y-6">
      <p className="text-sm text-muted-foreground">Invite a Warehouse Manager for a specific warehouse. They'll receive a link to set up their account.</p>

      {warehouses.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl p-8 text-center">
          <p className="text-sm text-muted-foreground">No warehouses found. Add an ERP connection first to discover warehouses.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div className="space-y-1.5">
            <Label>Warehouse</Label>
            <select value={selectedWh} onChange={e => setSelectedWh(e.target.value)}
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground">
              {warehouses.map(w => <option key={w.warehouse_number} value={w.warehouse_number}>WH-{w.warehouse_number} {w.name ? `— ${w.name}` : ''}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mgr-email">Manager Email</Label>
            <Input id="mgr-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="manager@company.com" />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button onClick={handleInvite} disabled={inviting || !email} className="w-full bg-indigo-600 hover:bg-indigo-700">
            {inviting ? <><Loader2 size={14} className="animate-spin mr-2" />Sending…</> : 'Send Invite'}
          </Button>

          {inviteUrl && (
            <div className="space-y-2 pt-2 border-t border-border/50">
              <div className="flex items-center gap-2 text-sm text-green-400">
                <CheckCircle2 size={14} /> Invite link created
              </div>
              <div className="bg-secondary rounded-lg p-3 text-xs text-muted-foreground break-all font-mono">{inviteUrl}</div>
              <Button variant="outline" className="w-full" onClick={copyLink}>
                {copied ? 'Copied!' : 'Copy Link'}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main admin page ───────────────────────────────────────────────────

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('connections');

  const tabs: { id: Tab; label: string }[] = [
    { id: 'connections', label: 'ERP Connections' },
    { id: 'settings', label: 'Settings' },
    { id: 'team', label: 'Team' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">IT Admin</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your ERP connections, API keys, and team.</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-8 border-b border-border">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                tab === t.id
                  ? 'border-indigo-500 text-indigo-300'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'connections' && <ConnectionsTab />}
        {tab === 'settings' && <SettingsTab />}
        {tab === 'team' && <TeamTab />}
      </main>
    </div>
  );
}
