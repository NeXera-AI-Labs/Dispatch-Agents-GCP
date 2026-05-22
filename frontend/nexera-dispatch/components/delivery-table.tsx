'use client';
import Link from 'next/link';
import type { Delivery } from '@/lib/types';
import { DeliveryStatusBadge, type DeliveryStatus } from '@/components/delivery-status-badge';

export function getDeliveryStatus(d: Delivery): DeliveryStatus {
  // HdrGoodsMvtIncompletionStatus 'C' = goods movement complete = Delivered
  if (d.HdrGoodsMvtIncompletionStatus === 'C') return 'Delivered';
  // Check if DeliveryDate is past
  if (d.DeliveryDate) {
    const due = new Date(d.DeliveryDate);
    if (!isNaN(due.getTime()) && due < new Date()) return 'Delayed';
  }
  return 'Open';
}

function formatDate(dateStr?: string) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' });
}

interface DeliveryTableProps {
  deliveries: Delivery[];
}

export function DeliveryTable({ deliveries }: DeliveryTableProps) {
  if (deliveries.length === 0) {
    return <div className="text-sm text-muted-foreground py-8 text-center">No deliveries found.</div>;
  }
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border bg-secondary/30">
            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Delivery</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ship-To</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Date</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Action</th>
          </tr>
        </thead>
        <tbody>
          {deliveries.map((d) => {
            const status = getDeliveryStatus(d);
            return (
              <tr key={d.DeliveryDocument} className="border-b border-border/50 last:border-0 hover:bg-secondary/20 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-indigo-400">{d.DeliveryDocument}</td>
                <td className="px-4 py-3 text-sm text-foreground">{d.ShipToParty ?? '—'}</td>
                <td className="px-4 py-3"><DeliveryStatusBadge status={status} /></td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(d.DeliveryDate)}</td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/dashboard/dispatch/${d.DeliveryDocument}`} className="text-xs text-indigo-400 hover:text-indigo-300 font-medium">
                    View →
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
