'use client';
import { useEffect, useState, useCallback } from 'react';
import { Package, Truck, UserPlus } from 'lucide-react';
import { getDelivery, getDeliveryItems, getAssignmentByDelivery } from '@/lib/api';
import type { Delivery, DeliveryItem, DriverAssignment } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { DeliveryStatusBadge } from '@/components/delivery-status-badge';
import { AssignDriverDialog } from '@/components/assign-driver-dialog';
import { AssignmentCard } from '@/components/assignment-card';
import { DeliveryMap } from '@/components/delivery-map';
import { getDeliveryStatus } from '@/components/delivery-table';

interface DispatchDetailPaneProps {
  deliveryId: string;
  warehouseAddress?: string;
  onAssignmentChange?: (deliveryId: string, assignment: DriverAssignment | null) => void;
}

function DetailRow({ label, value }: { label: string; value?: string | number }) {
  return (
    <div className="flex justify-between py-2 border-b border-border/40 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs text-foreground font-medium text-right">{value ?? '—'}</span>
    </div>
  );
}

export function DispatchDetailPane({ deliveryId, warehouseAddress, onAssignmentChange }: DispatchDetailPaneProps) {
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [items, setItems] = useState<DeliveryItem[]>([]);
  const [assignment, setAssignment] = useState<DriverAssignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [routeSummary, setRouteSummary] = useState<{ distance: string; duration: string } | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);

  const handleSummary = useCallback((s: { distance: string; duration: string }) => setRouteSummary(s), []);

  useEffect(() => {
    if (!deliveryId) return;
    setLoading(true);
    setError('');
    setDelivery(null);
    setItems([]);
    setAssignment(null);
    setRouteSummary(null);

    Promise.all([
      getDelivery(deliveryId).catch((e: Error) => { setError(e.message); return null; }),
      getDeliveryItems(deliveryId).catch(() => [] as DeliveryItem[]),
      getAssignmentByDelivery(deliveryId).catch(() => null),
    ]).then(([d, i, a]) => {
      setDelivery(d);
      setItems(i);
      setAssignment(a);
    }).finally(() => setLoading(false));
  }, [deliveryId]);

  function handleNewAssignment(qrImage: string, qrUrl: string, id?: string) {
    if (!id) return;
    getAssignmentByDelivery(deliveryId)
      .then(a => {
        const final = a ?? {
          ID: id,
          DeliveryDocument: deliveryId,
          MobileNumber: '',
          DriverName: '',
          TruckRegistration: '',
          Status: 'ASSIGNED' as const,
          AssignedAt: new Date().toISOString(),
          QRCodeImage: qrImage,
          QRCodeUrl: qrUrl,
        };
        setAssignment(final);
        onAssignmentChange?.(deliveryId, final);
      })
      .catch(() => {});
  }

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading delivery…</div>;
  }
  if (error) {
    return <div className="p-6 text-sm text-red-400">Error: {error}</div>;
  }
  if (!delivery) {
    return <div className="p-6 text-sm text-muted-foreground">Delivery not found.</div>;
  }

  const status = getDeliveryStatus(delivery, assignment ?? undefined);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-foreground font-mono">{delivery.DeliveryDocument}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {delivery.ShipToParty ? `Ship-to ${delivery.ShipToParty}` : 'Delivery details'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <DeliveryStatusBadge status={status} />
          {!assignment && (
            <Button
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700"
              onClick={() => setAssignOpen(true)}
            >
              <UserPlus size={14} className="mr-1.5" />
              Assign Driver
            </Button>
          )}
        </div>
      </div>

      {/* Items */}
      {items.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Package size={14} className="text-indigo-400" />
            Items ({items.length})
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border/50">
                  <th className="py-2 pr-4 font-medium">Item</th>
                  <th className="py-2 pr-4 font-medium">Material</th>
                  <th className="py-2 pr-4 font-medium">Qty</th>
                  <th className="py-2 font-medium">Storage</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.DeliveryDocumentItem} className="border-b border-border/30 last:border-0">
                    <td className="py-2 pr-4 font-mono text-muted-foreground">{item.DeliveryDocumentItem}</td>
                    <td className="py-2 pr-4 text-foreground">{item.Material ?? '—'}</td>
                    <td className="py-2 pr-4 text-foreground">{item.ActualDeliveryQuantity} {item.DeliveryQuantityUnit}</td>
                    <td className="py-2 text-muted-foreground">{item.StorageLocation ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Map */}
      <DeliveryMap
        shipToParty={delivery.ShipToParty}
        assignmentId={assignment?.ID}
        warehouseAddress={warehouseAddress}
        onSummary={handleSummary}
        height={380}
      />

      {/* Delivery Details */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3">Delivery Details</h3>
        <DetailRow label="Ship-To Party" value={delivery.ShipToParty} />
        <DetailRow label="Shipping Point" value={delivery.ShippingPoint} />
        <DetailRow label="Route" value={delivery.ActualDeliveryRoute} />
        <DetailRow label="Delivery Date" value={delivery.DeliveryDate ? new Date(delivery.DeliveryDate).toLocaleDateString() : undefined} />
        <DetailRow label="Gross Weight" value={delivery.HeaderGrossWeight !== undefined ? `${delivery.HeaderGrossWeight} kg` : undefined} />
        <DetailRow label="Sales Org" value={delivery.SalesOrganization} />
      </div>

      {/* Assignment (only if exists) */}
      {assignment && (
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Truck size={14} className="text-indigo-400" />
            Driver Assignment
          </h3>
          <AssignmentCard assignment={assignment} routeSummary={routeSummary} />
        </div>
      )}

      <AssignDriverDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        deliveryDoc={deliveryId}
        onAssigned={handleNewAssignment}
      />
    </div>
  );
}
