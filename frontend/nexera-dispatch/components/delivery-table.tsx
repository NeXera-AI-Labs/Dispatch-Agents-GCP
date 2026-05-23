'use client';
import Link from 'next/link';
import type { Delivery, DriverAssignment } from '@/lib/types';
import { DeliveryStatusBadge, type DeliveryStatus } from '@/components/delivery-status-badge';

// Status derivation:
//   - No DriverAssignment for the delivery        → Not Assigned
//   - assignment.Status = 'DELIVERED'             → Delivered
//   - assignment.Status = 'ASSIGNED' | 'IN_TRANSIT' → On the Way
export function getDeliveryStatus(_d: Delivery, assignment?: DriverAssignment): DeliveryStatus {
  if (!assignment) return 'Not Assigned';
  if (assignment.Status === 'DELIVERED') return 'Delivered';
  return 'On the Way';
}

function formatDate(dateStr?: string) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' });
}

function formatAssignedAt(iso?: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-GB', {
    day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
  });
}

interface DeliveryTableProps {
  deliveries: Delivery[];
  assignmentsByDelivery?: Record<string, DriverAssignment>;
}

export function DeliveryTable({ deliveries, assignmentsByDelivery = {} }: DeliveryTableProps) {
  if (deliveries.length === 0) {
    return <div className="text-sm text-muted-foreground py-8 text-center">No deliveries found.</div>;
  }
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px]">
          <thead>
            <tr className="border-b border-border bg-secondary/30">
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Delivery</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ship-To</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Driver</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Truck</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Assigned</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">ETA</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Date</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Action</th>
            </tr>
          </thead>
          <tbody>
            {deliveries.map((d) => {
              const assignment = assignmentsByDelivery[d.DeliveryDocument];
              const status = getDeliveryStatus(d, assignment);
              return (
                <tr key={d.DeliveryDocument} className="border-b border-border/50 last:border-0 hover:bg-secondary/20 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-indigo-400">{d.DeliveryDocument}</td>
                  <td className="px-4 py-3 text-sm text-foreground">{d.ShipToParty ?? '—'}</td>
                  <td className="px-4 py-3 text-sm text-foreground">{assignment?.DriverName ?? '—'}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{assignment?.TruckRegistration ?? '—'}</td>
                  <td className="px-4 py-3"><DeliveryStatusBadge status={status} /></td>
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{assignment ? formatAssignedAt(assignment.AssignedAt) : '—'}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{assignment?.EstimatedDuration ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{formatDate(d.DeliveryDate)}</td>
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
    </div>
  );
}
