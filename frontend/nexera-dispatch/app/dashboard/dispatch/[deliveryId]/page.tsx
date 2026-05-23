'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Package } from 'lucide-react';
import { getDelivery, getDeliveryItems, listWarehouses, getAssignmentByDelivery } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { DeliveryMap } from '@/components/delivery-map';
import type { Delivery, DeliveryItem, Warehouse, DriverAssignment } from '@/lib/types';
import { Navbar } from '@/components/navbar';
import { DeliveryStatusBadge } from '@/components/delivery-status-badge';
import { DriverAssignForm } from '@/components/driver-assign-form';
import { AssignmentCard } from '@/components/assignment-card';
import { getDeliveryStatus } from '@/components/delivery-table';

function DetailRow({ label, value }: { label: string; value?: string | number }) {
  return (
    <div className="flex justify-between py-2 border-b border-border/50 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs text-foreground font-medium">{value ?? '—'}</span>
    </div>
  );
}

export default function DeliveryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const deliveryId = params?.deliveryId as string;
  const [warehouseNumber, setWarehouseNumber] = useState<string | undefined>(undefined);
  const [warehouseAddress, setWarehouseAddress] = useState<string | undefined>(undefined);

  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [items, setItems] = useState<DeliveryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [assignment, setAssignment] = useState<DriverAssignment | null>(null);

  useEffect(() => {
    // SSR-safe: read user from localStorage only on client
    const user = getCurrentUser();
    const wh = user?.warehouse_numbers?.[0];
    setWarehouseNumber(wh);
    // Fetch warehouse address for use as map origin
    if (wh) {
      listWarehouses()
        .then((warehouses: Warehouse[]) => {
          const match = warehouses.find((w: Warehouse) => w.warehouse_number === wh);
          if (match) {
            const addr = [match.physical_address, match.city, match.country].filter(Boolean).join(', ');
            if (addr) setWarehouseAddress(addr);
          }
        })
        .catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!deliveryId) return;
    // Fetch delivery, items, and existing assignment independently
    getDelivery(deliveryId)
      .then(setDelivery)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
    getDeliveryItems(deliveryId)
      .then(setItems)
      .catch(() => setItems([]));
    getAssignmentByDelivery(deliveryId)
      .then(setAssignment)
      .catch(() => setAssignment(null));
  }, [deliveryId]);

  function handleNewAssignment(qrImage: string, qrUrl: string, id?: string) {
    // After successful assign, refetch the canonical assignment so the card has full data (ETA, etc.)
    if (id) {
      getAssignmentByDelivery(deliveryId)
        .then(a => setAssignment(a ?? {
          ID: id,
          DeliveryDocument: deliveryId,
          MobileNumber: '',
          DriverName: '',
          TruckRegistration: '',
          Status: 'ASSIGNED',
          AssignedAt: new Date().toISOString(),
          QRCodeImage: qrImage,
          QRCodeUrl: qrUrl,
        }))
        .catch(() => {});
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar warehouseNumber={warehouseNumber} />
      <main className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {/* Back + title */}
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-foreground font-mono">{deliveryId}</h1>
            <p className="text-xs text-muted-foreground">Delivery Document</p>
          </div>
        </div>

        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {error && <p className="text-sm text-red-400">Error: {error}</p>}

        {delivery && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Left: delivery info */}
            <div className="space-y-4">
              <div className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-foreground">Delivery Details</h2>
                  <DeliveryStatusBadge status={getDeliveryStatus(delivery, assignment ?? undefined)} />
                </div>
                <DetailRow label="Ship-To Party" value={delivery.ShipToParty} />
                <DetailRow label="Shipping Point" value={delivery.ShippingPoint} />
                <DetailRow label="Route" value={delivery.ActualDeliveryRoute} />
                <DetailRow label="Delivery Date" value={delivery.DeliveryDate ? new Date(delivery.DeliveryDate).toLocaleDateString() : undefined} />
                <DetailRow label="Gross Weight" value={delivery.HeaderGrossWeight !== undefined ? `${delivery.HeaderGrossWeight} kg` : undefined} />
                <DetailRow label="Sales Org" value={delivery.SalesOrganization} />
              </div>

              {/* Items */}
              {items.length > 0 && (
                <div className="bg-card border border-border rounded-xl p-5">
                  <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Package size={14} className="text-indigo-400" />
                    Items ({items.length})
                  </h2>
                  <div className="space-y-2">
                    {items.map(item => (
                      <div key={item.DeliveryDocumentItem} className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{item.DeliveryDocumentItem} — {item.Material ?? '—'}</span>
                        <span className="text-foreground font-medium">{item.ActualDeliveryQuantity} {item.DeliveryQuantityUnit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right: existing assignment card OR assign form */}
            <div className="bg-card border border-border rounded-xl p-5">
              {assignment ? (
                <AssignmentCard assignment={assignment} />
              ) : (
                <DriverAssignForm
                  deliveryDoc={deliveryId}
                  onAssigned={handleNewAssignment}
                />
              )}
            </div>
          </div>
        )}

        {delivery && (
          <DeliveryMap
            shipToParty={delivery.ShipToParty}
            assignmentId={assignment?.ID}
            warehouseAddress={warehouseAddress}
          />
        )}
      </main>
    </div>
  );
}
