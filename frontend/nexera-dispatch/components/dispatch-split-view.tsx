'use client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ChevronRight, Download, Loader2, PackageOpen } from 'lucide-react';
import { listDeliveries, listAssignments, listWarehouses, importDeliveries } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import type { Delivery, DriverAssignment, Warehouse } from '@/lib/types';
import { Navbar } from '@/components/navbar';
import { ChatPanel } from '@/components/chat-panel';
import { DeliveryStatusBadge, type DeliveryStatus } from '@/components/delivery-status-badge';
import { getDeliveryStatus } from '@/components/delivery-table';
import { DispatchDetailPane } from '@/components/dispatch-detail-pane';

interface DispatchSplitViewProps {
  /** Initial delivery to show in the right pane (from URL). null = list-only on small screens. */
  initialDeliveryId?: string;
}

const FILTERS: ReadonlyArray<DeliveryStatus | 'All'> = ['All', 'Not Assigned', 'On the Way', 'Delivered'];

function formatAssignedAt(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function DispatchSplitView({ initialDeliveryId }: DispatchSplitViewProps) {
  const router = useRouter();
  const [warehouseNumber, setWarehouseNumber] = useState('0001');
  const [warehouseAddress, setWarehouseAddress] = useState<string | undefined>(undefined);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [assignmentsByDelivery, setAssignmentsByDelivery] = useState<Record<string, DriverAssignment>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [chatOpen, setChatOpen] = useState(false);
  const [filter, setFilter] = useState<DeliveryStatus | 'All'>('All');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | undefined>(initialDeliveryId);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState('');

  // Load user, warehouse address, deliveries, assignments
  const loadData = useCallback((wh: string, autoSelect: boolean) => {
    setLoading(true);
    setError('');
    return Promise.all([
      listDeliveries(wh),
      listAssignments().catch(() => []),
      listWarehouses().catch(() => [] as Warehouse[]),
    ])
      .then(([d, a, whs]) => {
        setDeliveries(d);
        const sorted = [...a].sort((x, y) => (y.AssignedAt ?? '').localeCompare(x.AssignedAt ?? ''));
        const byDelivery: Record<string, DriverAssignment> = {};
        for (const row of sorted) {
          if (row.DeliveryDocument && !byDelivery[row.DeliveryDocument]) {
            byDelivery[row.DeliveryDocument] = row;
          }
        }
        setAssignmentsByDelivery(byDelivery);

        const match = whs.find(w => w.warehouse_number === wh);
        if (match) {
          const addr = [match.physical_address, match.city, match.country].filter(Boolean).join(', ');
          if (addr) setWarehouseAddress(addr);
        }

        if (autoSelect && d.length > 0) {
          setSelected(d[0].DeliveryDocument);
        }
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const user = getCurrentUser();
    const wh = user?.warehouse_numbers?.[0] ?? '0001';
    setWarehouseNumber(wh);
    loadData(wh, !initialDeliveryId);
  }, [initialDeliveryId, loadData]);

  const handleImport = useCallback(async () => {
    setImporting(true);
    setImportMsg('');
    try {
      const r = await importDeliveries();
      setImportMsg(`Imported ${r.headerCount} deliveries, ${r.itemCount} items in ${(r.durationMs / 1000).toFixed(1)}s`);
      await loadData(warehouseNumber, deliveries.length === 0);
    } catch (e) {
      setImportMsg(`Import failed: ${(e as Error).message}`);
    } finally {
      setImporting(false);
      setTimeout(() => setImportMsg(''), 5000);
    }
  }, [loadData, warehouseNumber, deliveries.length]);

  const counts = useMemo(() => ({
    'Not Assigned': deliveries.filter(d => getDeliveryStatus(d, assignmentsByDelivery[d.DeliveryDocument]) === 'Not Assigned').length,
    'On the Way':   deliveries.filter(d => getDeliveryStatus(d, assignmentsByDelivery[d.DeliveryDocument]) === 'On the Way').length,
    'Delivered':    deliveries.filter(d => getDeliveryStatus(d, assignmentsByDelivery[d.DeliveryDocument]) === 'Delivered').length,
  }), [deliveries, assignmentsByDelivery]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return deliveries.filter(d => {
      const status = getDeliveryStatus(d, assignmentsByDelivery[d.DeliveryDocument]);
      if (filter !== 'All' && status !== filter) return false;
      if (q && !(
        d.DeliveryDocument.toLowerCase().includes(q) ||
        (d.ShipToParty ?? '').toLowerCase().includes(q) ||
        (assignmentsByDelivery[d.DeliveryDocument]?.DriverName ?? '').toLowerCase().includes(q)
      )) return false;
      return true;
    });
  }, [deliveries, assignmentsByDelivery, filter, search]);

  // When user picks a row, push the URL so it's deep-linkable. shallow nav (no full reload)
  // keeps the list rendered as-is.
  const handleSelect = useCallback((id: string) => {
    setSelected(id);
    router.push(`/dashboard/dispatch/${id}`, { scroll: false });
  }, [router]);

  const handleAssignmentChange = useCallback((deliveryId: string, assignment: DriverAssignment | null) => {
    setAssignmentsByDelivery(prev => {
      const next = { ...prev };
      if (assignment) next[deliveryId] = assignment;
      else delete next[deliveryId];
      return next;
    });
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar warehouseNumber={warehouseNumber} onAskAI={() => setChatOpen(v => !v)} />

      {/* Filter bar — stretches across full width above the split */}
      <div className="border-b border-border bg-card/40">
        <div className="px-4 lg:px-6 py-3 flex flex-wrap items-center gap-3">
          <h1 className="text-lg font-bold text-foreground mr-2">Dispatcher</h1>
          <span className="text-xs text-muted-foreground">WH {warehouseNumber}</span>

          <div className="flex gap-1.5 ml-2">
            {FILTERS.map(f => {
              const count = f === 'All' ? deliveries.length : counts[f];
              return (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                    filter === f
                      ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300'
                      : 'border-border text-muted-foreground hover:border-border/80'
                  }`}>
                  {f} <span className="opacity-60">({count})</span>
                </button>
              );
            })}
          </div>

          <div className="relative ml-auto w-full sm:w-72">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search delivery, ship-to, driver…"
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-secondary/50 border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-indigo-500/40"
            />
          </div>

          <button
            onClick={handleImport}
            disabled={importing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {importing
              ? <><Loader2 size={13} className="animate-spin" /> Importing…</>
              : <><Download size={13} /> Import Deliveries</>}
          </button>
        </div>
        {importMsg && (
          <div className="px-4 lg:px-6 pb-2 text-xs text-indigo-300">{importMsg}</div>
        )}
      </div>

      {/* Master-detail split — fills remaining viewport */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: list */}
        <aside className="w-full lg:w-1/3 shrink-0 border-r border-border overflow-y-auto bg-card/20">
          {loading ? (
            <div className="p-6 text-sm text-muted-foreground">Loading deliveries…</div>
          ) : error ? (
            <div className="p-6 text-sm text-red-400">Error: {error}</div>
          ) : deliveries.length === 0 ? (
            <div className="p-8 text-center">
              <PackageOpen size={32} className="mx-auto text-muted-foreground/60 mb-3" />
              <p className="text-sm text-foreground font-medium mb-1">No deliveries yet</p>
              <p className="text-xs text-muted-foreground mb-4">Import deliveries from your connected ERP to get started.</p>
              <button
                onClick={handleImport}
                disabled={importing}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-60"
              >
                {importing
                  ? <><Loader2 size={13} className="animate-spin" /> Importing…</>
                  : <><Download size={13} /> Import Deliveries</>}
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">No deliveries match.</div>
          ) : (
            <ul>
              {filtered.map(d => {
                const a = assignmentsByDelivery[d.DeliveryDocument];
                const status = getDeliveryStatus(d, a);
                const isSelected = selected === d.DeliveryDocument;
                return (
                  <li key={d.DeliveryDocument}>
                    <button
                      onClick={() => handleSelect(d.DeliveryDocument)}
                      className={`w-full text-left px-4 py-3 border-b border-border/40 transition-colors ${
                        isSelected
                          ? 'bg-indigo-500/10 border-l-2 border-l-indigo-500'
                          : 'hover:bg-secondary/30 border-l-2 border-l-transparent'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-indigo-400 truncate">{d.DeliveryDocument}</span>
                            <DeliveryStatusBadge status={status} />
                          </div>
                          <div className="text-xs text-foreground mt-1 truncate">
                            Ship-to {d.ShipToParty ?? '—'}
                          </div>
                          <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                            {a?.DriverName && <span className="truncate max-w-[120px]">🚚 {a.DriverName}</span>}
                            {a?.AssignedAt && <span>{formatAssignedAt(a.AssignedAt)}</span>}
                            {a?.EstimatedDuration && <span className="text-indigo-400/80">ETA {a.EstimatedDuration}</span>}
                            {!a && d.DeliveryDate && <span>{new Date(d.DeliveryDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>}
                          </div>
                        </div>
                        <ChevronRight size={14} className={`shrink-0 mt-1 ${isSelected ? 'text-indigo-400' : 'text-muted-foreground/50'}`} />
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        {/* Right: detail */}
        <section className="flex-1 overflow-y-auto">
          <div className="px-4 lg:px-6 py-6">
            {selected ? (
              <DispatchDetailPane
                key={selected}
                deliveryId={selected}
                warehouseAddress={warehouseAddress}
                onAssignmentChange={handleAssignmentChange}
              />
            ) : (
              <div className="text-sm text-muted-foreground py-12 text-center">
                Select a delivery from the list to see details.
              </div>
            )}
          </div>
        </section>
      </div>

      {chatOpen && (
        <ChatPanel
          warehouseNumber={warehouseNumber}
          onClose={() => setChatOpen(false)}
        />
      )}
    </div>
  );
}
