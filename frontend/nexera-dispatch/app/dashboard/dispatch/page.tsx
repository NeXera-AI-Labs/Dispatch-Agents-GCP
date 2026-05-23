'use client';
import { useEffect, useState } from 'react';
import { getCurrentUser } from '@/lib/auth';
import { listDeliveries, listAssignments } from '@/lib/api';
import type { Delivery, DriverAssignment } from '@/lib/types';
import { Navbar } from '@/components/navbar';
import { KpiCard } from '@/components/kpi-card';
import { DeliveryTable, getDeliveryStatus } from '@/components/delivery-table';
import type { DeliveryStatus } from '@/components/delivery-status-badge';
import { ChatPanel } from '@/components/chat-panel';

export default function DispatchPage() {
  const [warehouseNumber, setWarehouseNumber] = useState('0001');
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [assignmentsByDelivery, setAssignmentsByDelivery] = useState<Record<string, DriverAssignment>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [chatOpen, setChatOpen] = useState(false);
  const [filter, setFilter] = useState<DeliveryStatus | 'All'>('All');

  useEffect(() => {
    const user = getCurrentUser();
    const wh = user?.warehouse_numbers?.[0] ?? '0001';
    setWarehouseNumber(wh);
    Promise.all([listDeliveries(wh), listAssignments().catch(() => [])])
      .then(([deliveriesRes, assignments]) => {
        setDeliveries(deliveriesRes);
        // Latest assignment wins per delivery (sort by AssignedAt desc, then index by DeliveryDocument)
        const sorted = [...assignments].sort((a, b) =>
          (b.AssignedAt ?? '').localeCompare(a.AssignedAt ?? '')
        );
        const byDelivery: Record<string, DriverAssignment> = {};
        for (const a of sorted) {
          if (a.DeliveryDocument && !byDelivery[a.DeliveryDocument]) {
            byDelivery[a.DeliveryDocument] = a;
          }
        }
        setAssignmentsByDelivery(byDelivery);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const counts = {
    'Not Assigned': deliveries.filter(d => getDeliveryStatus(d, assignmentsByDelivery[d.DeliveryDocument]) === 'Not Assigned').length,
    'On the Way':   deliveries.filter(d => getDeliveryStatus(d, assignmentsByDelivery[d.DeliveryDocument]) === 'On the Way').length,
    'Delivered':    deliveries.filter(d => getDeliveryStatus(d, assignmentsByDelivery[d.DeliveryDocument]) === 'Delivered').length,
  };

  const filtered = filter === 'All'
    ? deliveries
    : deliveries.filter(d => getDeliveryStatus(d, assignmentsByDelivery[d.DeliveryDocument]) === filter);

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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KpiCard label="Not Assigned" value={counts['Not Assigned']} />
          <KpiCard label="On the Way"   value={counts['On the Way']}   accent="indigo" />
          <KpiCard label="Delivered"    value={counts.Delivered}        accent="green" />
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 flex-wrap">
          {(['All', 'Not Assigned', 'On the Way', 'Delivered'] as const).map(f => (
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
          <DeliveryTable deliveries={filtered} assignmentsByDelivery={assignmentsByDelivery} />
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
