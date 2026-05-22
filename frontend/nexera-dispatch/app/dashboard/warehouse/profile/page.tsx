'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getCurrentUser } from '@/lib/auth';
import { Navbar } from '@/components/navbar';

export default function WarehouseProfilePage() {
  const router = useRouter();
  const user = getCurrentUser();
  const warehouseNumber = user?.warehouse_numbers?.[0] ?? '0001';

  const [form, setForm] = useState({
    name: `Warehouse ${warehouseNumber}`,
    address: '',
    city: '',
    country: '',
    lat: '',
    lng: '',
    hours_open: '08:00',
    hours_close: '18:00',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      // POST to /api/warehouse/profile (wired in a future task or just show success for demo)
      await new Promise((r) => setTimeout(r, 600));
      setSaved(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar warehouseNumber={warehouseNumber} />
      <main className="max-w-xl mx-auto px-6 py-10 space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-foreground">Warehouse Profile</h1>
            <p className="text-xs text-muted-foreground">WH-{warehouseNumber}</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="wh-name">Warehouse Name</Label>
            <Input id="wh-name" value={form.name} onChange={(e) => update('name', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="wh-address">Address</Label>
            <Input id="wh-address" value={form.address} onChange={(e) => update('address', e.target.value)} placeholder="Street address" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="wh-city">City</Label>
              <Input id="wh-city" value={form.city} onChange={(e) => update('city', e.target.value)} placeholder="Hamburg" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wh-country">Country</Label>
              <Input id="wh-country" value={form.country} onChange={(e) => update('country', e.target.value)} placeholder="DE" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="wh-lat">Latitude</Label>
              <Input id="wh-lat" value={form.lat} onChange={(e) => update('lat', e.target.value)} placeholder="53.5511" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wh-lng">Longitude</Label>
              <Input id="wh-lng" value={form.lng} onChange={(e) => update('lng', e.target.value)} placeholder="9.9937" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="wh-open">Opening Time</Label>
              <Input id="wh-open" type="time" value={form.hours_open} onChange={(e) => update('hours_open', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wh-close">Closing Time</Label>
              <Input id="wh-close" type="time" value={form.hours_close} onChange={(e) => update('hours_close', e.target.value)} />
            </div>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}
          {saved && <p className="text-xs text-green-400">Profile saved successfully.</p>}

          <Button className="w-full bg-indigo-600 hover:bg-indigo-700" onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 size={14} className="mr-2 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save size={14} className="mr-2" />
                Save Profile
              </>
            )}
          </Button>
        </div>
      </main>
    </div>
  );
}
