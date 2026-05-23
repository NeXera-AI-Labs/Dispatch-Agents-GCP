'use client';
import { useEffect, useState, useCallback } from 'react';
import { Package, Truck } from 'lucide-react';
import { getDelivery, getDeliveryItems, getAssignmentByDelivery } from '@/lib/api';
import type { Delivery, DeliveryItem, DriverAssignment } from '@/lib/types';
import { DeliveryStatusBadge } from '@/components/delivery-status-badge';
import { DriverAssignForm } from '@/components/driver-assign-form';
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

  // Stable callback so DeliveryMap's effect deps don't churn
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

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground font-mono">{delivery.DeliveryDocument}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {delivery.ShipToParty ? `Ship-to ${delivery.ShipToParty}` : 'Delivery details'}
          </p>
        </div>
        <DeliveryStatusBadge status={getDeliveryStatus(delivery, assignment ?? undefined)} />
      </div>

      {/* Map — full width */}
      <DeliveryMap
        shipToParty={delivery.ShipToParty}
        assignmentId={assignment?.ID}
        warehouseAddress={warehouseAddress}
        onSummary={handleSummary}
        height={380}
      />

      {/* Two-column: details + assignment / items */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3">Delivery Details</h3>
          <DetailRow label="Ship-To Party" value={delivery.ShipToParty} />
          <DetailRow label="Shipping Point" value={delivery.ShippingPoint} />
          <DetailRow label="Route" value={delivery.ActualDeliveryRoute} />
          <DetailRow label="Delivery Date" value={delivery.DeliveryDate ? new Date(delivery.DeliveryDate).toLocaleDateString() : undefined} />
          <DetailRow label="Gross Weight" value={delivery.HeaderGrossWeight !== undefined ? `${delivery.HeaderGrossWeight} kg` : undefined} />
          <DetailRow label="Sales Org" value={delivery.SalesOrganization} />
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Truck size={14} className="text-indigo-400" />
            {assignment ? 'Driver Assignment' : 'Assign Driver'}
          </h3>
          {assignment ? (
            <AssignmentCard assignment={assignment} routeSummary={routeSummary} />
          ) : (
            <DriverAssignForm
              deliveryDoc={deliveryId}
              onAssigned={handleNewAssignment}
            />
          )}
        </div>
      </div>

      {/* Items — full width */}
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
    </div>
  );
}
