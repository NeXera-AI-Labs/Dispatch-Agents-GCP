'use client';
import { useEffect, useState } from 'react';
import { getCurrentUser } from '@/lib/auth';
import { listDeliveries } from '@/lib/api';
import type { Delivery } from '@/lib/types';
import { Navbar } from '@/components/navbar';
import { KpiCard } from '@/components/kpi-card';
import { DeliveryTable, getDeliveryStatus } from '@/components/delivery-table';
import type { DeliveryStatus } from '@/components/delivery-status-badge';
import { ChatPanel } from '@/components/chat-panel';

export default function DispatchPage() {
  const [warehouseNumber, setWarehouseNumber] = useState('0001');
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [chatOpen, setChatOpen] = useState(false);
  const [filter, setFilter] = useState<DeliveryStatus | 'All'>('All');

  useEffect(() => {
    const user = getCurrentUser();
    const wh = user?.warehouse_numbers?.[0] ?? '0001';
    setWarehouseNumber(wh);
    listDeliveries(wh)
      .then(setDeliveries)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const counts = {
    Open: deliveries.filter(d => getDeliveryStatus(d) === 'Open').length,
    'In Transit': deliveries.filter(d => getDeliveryStatus(d) === 'In Transit').length,
    Delayed: deliveries.filter(d => getDeliveryStatus(d) === 'Delayed').length,
    Delivered: deliveries.filter(d => getDeliveryStatus(d) === 'Delivered').length,
  };

  const filtered = filter === 'All' ? deliveries : deliveries.filter(d => getDeliveryStatus(d) === filter);

  return (
    <div className="min-h-screen bg-background">
      <Navbar
        warehouseNumber={warehouseNumber}
        onAskAI={() => setChatOpen(v => !v)}
      />
      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dispatcher Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Warehouse {warehouseNumber}</p>
        </div>

        {/* KPI tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <KpiCard label="Open" value={counts.Open} />
          <KpiCard label="In Transit" value={counts['In Transit']} accent="indigo" />
          <KpiCard label="Delayed" value={counts.Delayed} accent="yellow" />
          <KpiCard label="Delivered" value={counts.Delivered} accent="green" />
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 flex-wrap">
          {(['All', 'Open', 'In Transit', 'Delayed', 'Delivered'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                filter === f
                  ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300'
                  : 'border-border text-muted-foreground hover:border-border/80'
              }`}>
              {f}
            </button>
          ))}
        </div>

        {/* Delivery table */}
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading deliveries…</div>
        ) : error ? (
          <div className="text-sm text-red-400">Error: {error}</div>
        ) : (
          <DeliveryTable deliveries={filtered} />
        )}
      </main>

      {chatOpen && (
        <ChatPanel
          warehouseNumber={warehouseNumber}
          onClose={() => setChatOpen(false)}
        />
      )}
    </div>
  );
}
