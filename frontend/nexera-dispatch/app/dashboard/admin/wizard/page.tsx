'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StepWizard } from '@/components/step-wizard';
import { Navbar } from '@/components/navbar';
import { saveConnection, testConnection, assignWarehouseManager } from '@/lib/api';

const ERP_TYPES = ['SAP S/4HANA', 'SAP ECC', 'Odoo', 'Oracle'];
const AUTH_TYPES = ['API Key', 'OAuth2', 'Basic Auth'];
const STEPS = ['ERP Details', 'Authentication', 'Test Connection', 'Invite Manager'];

export default function WizardPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [erpType, setErpType] = useState('SAP S/4HANA');
  const [baseUrl, setBaseUrl] = useState('');
  const [authType, setAuthType] = useState('API Key');
  const [apiKey, setApiKey] = useState('');
  const [connId, setConnId] = useState('');
  const [warehouses, setWarehouses] = useState<string[]>([]);
  const [testStatus, setTestStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [testMsg, setTestMsg] = useState('');
  const [managerEmail, setManagerEmail] = useState('');
  const [selectedWh, setSelectedWh] = useState('');
  const [inviteUrl, setInviteUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    setSaving(true); setError('');
    try {
      const res = await saveConnection({
        name,
        erp_type: erpType,
        auth_type: authType,
        base_url: baseUrl,
        api_key: apiKey,
      });
      setConnId(res.connection_id);
      setStep(2);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save connection');
    } finally { setSaving(false); }
  }

  async function handleTest() {
    setTestStatus('loading'); setTestMsg('');
    try {
      const res = await testConnection(connId);
      if (res.success) {
        setTestStatus('ok');
        setWarehouses(res.warehouse_numbers);
        if (res.warehouse_numbers.length > 0) setSelectedWh(res.warehouse_numbers[0]);
        setStep(3);
      } else {
        setTestStatus('error');
        setTestMsg(res.message || 'Test failed');
      }
    } catch (e: unknown) {
      setTestStatus('error');
      setTestMsg(e instanceof Error ? e.message : 'Test failed');
    }
  }

  async function handleInvite() {
    if (!managerEmail || !selectedWh) return;
    setSaving(true); setError('');
    try {
      const res = await assignWarehouseManager(connId, selectedWh, managerEmail);
      setInviteUrl(res.invite_url);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to send invite');
    } finally { setSaving(false); }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Add ERP Connection</h1>
          <p className="text-sm text-muted-foreground mt-1">Connect your ERP system in 4 steps</p>
        </div>

        <StepWizard steps={STEPS} currentStep={step}>
          <div className="bg-card border border-border rounded-xl p-6 space-y-5">
            {error && <p className="text-sm text-red-400">{error}</p>}

            {/* Step 0: ERP Details */}
            {step === 0 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="conn-name">Connection Name</Label>
                  <Input id="conn-name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. SAP S/4 Production" />
                </div>
                <div className="space-y-2">
                  <Label>ERP Type</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {ERP_TYPES.map(t => (
                      <button key={t} onClick={() => setErpType(t)}
                        className={`px-3 py-2 rounded-lg border text-sm transition-colors ${erpType === t ? 'border-indigo-500 bg-indigo-600/10 text-indigo-300' : 'border-border text-muted-foreground hover:border-border/80'}`}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="base-url">OData Base URL</Label>
                  <Input id="base-url" value={baseUrl} onChange={e => setBaseUrl(e.target.value)} placeholder="https://your-sap.example.com/sap/opu/odata/sap/..." />
                </div>
                <Button className="w-full bg-indigo-600 hover:bg-indigo-700" onClick={() => setStep(1)} disabled={!name || !baseUrl}>
                  Next: Authentication
                </Button>
              </>
            )}

            {/* Step 1: Auth Type */}
            {step === 1 && (
              <>
                <div className="space-y-2">
                  <Label>Authentication Method</Label>
                  <div className="space-y-2">
                    {AUTH_TYPES.map(t => (
                      <button key={t} onClick={() => setAuthType(t)}
                        className={`w-full px-4 py-3 rounded-lg border text-sm text-left transition-colors ${authType === t ? 'border-indigo-500 bg-indigo-600/10 text-indigo-300' : 'border-border text-muted-foreground hover:border-border/80'}`}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                {authType === 'API Key' && (
                  <div className="space-y-2">
                    <Label htmlFor="api-key">API Key</Label>
                    <Input id="api-key" type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="Paste your API key" />
                  </div>
                )}
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep(0)} className="flex-1">Back</Button>
                  <Button className="flex-1 bg-indigo-600 hover:bg-indigo-700" onClick={handleSave} disabled={saving}>
                    {saving ? <><Loader2 size={14} className="mr-2 animate-spin" />Saving…</> : 'Save & Test Connection'}
                  </Button>
                </div>
              </>
            )}

            {/* Step 2: Test */}
            {step === 2 && (
              <>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">Connection saved. Now let&apos;s test it and discover your warehouses.</p>
                  {testStatus === 'loading' && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 size={14} className="animate-spin" /> Testing connection…
                    </div>
                  )}
                  {testStatus === 'ok' && (
                    <div className="flex items-center gap-2 text-sm text-green-400">
                      <CheckCircle2 size={14} /> Connected! Found warehouses: {warehouses.join(', ')}
                    </div>
                  )}
                  {testStatus === 'error' && (
                    <div className="flex items-center gap-2 text-sm text-red-400">
                      <AlertCircle size={14} /> {testMsg}
                    </div>
                  )}
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep(1)} className="flex-1">Back</Button>
                  <Button className="flex-1 bg-indigo-600 hover:bg-indigo-700" onClick={handleTest} disabled={testStatus === 'loading'}>
                    {testStatus === 'loading' ? 'Testing…' : 'Test & Continue'}
                  </Button>
                </div>
              </>
            )}

            {/* Step 3: Invite WH Manager */}
            {step === 3 && (
              <>
                {!inviteUrl ? (
                  <>
                    <p className="text-sm text-muted-foreground">Invite a Warehouse Manager to manage this connection.</p>
                    {warehouses.length > 1 && (
                      <div className="space-y-2">
                        <Label>Warehouse</Label>
                        <select value={selectedWh} onChange={e => setSelectedWh(e.target.value)}
                          className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground">
                          {warehouses.map(w => <option key={w} value={w}>WH-{w}</option>)}
                        </select>
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="mgr-email">Manager Email</Label>
                      <Input id="mgr-email" type="email" value={managerEmail} onChange={e => setManagerEmail(e.target.value)} placeholder="manager@company.com" />
                    </div>
                    <div className="flex gap-3">
                      <Button variant="outline" className="flex-1" onClick={() => router.push('/dashboard/admin')}>Skip</Button>
                      <Button className="flex-1 bg-indigo-600 hover:bg-indigo-700" onClick={handleInvite} disabled={saving || !managerEmail}>
                        {saving ? <><Loader2 size={14} className="mr-2 animate-spin" />Sending…</> : 'Send Invite'}
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm text-green-400">
                      <CheckCircle2 size={14} /> Invite link created!
                    </div>
                    <div className="bg-secondary rounded-lg p-3 text-xs text-muted-foreground break-all font-mono">{inviteUrl}</div>
                    <Button className="w-full" variant="outline" onClick={() => { navigator.clipboard.writeText(inviteUrl); }}>
                      Copy Link
                    </Button>
                    <Button className="w-full bg-indigo-600 hover:bg-indigo-700" onClick={() => router.push('/dashboard/admin')}>
                      Done
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </StepWizard>
      </main>
    </div>
  );
}
