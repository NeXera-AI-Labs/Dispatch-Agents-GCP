'use client';
import { Truck, MapPin, Clock, Package2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { DriverAssignment } from '@/lib/types';
import { resolveSapAddress } from '@/lib/addresses';

interface DeliveryRouteCardProps {
  shipFromCode?: string;          // ShippingPoint
  shipToCode?: string;             // ShipToParty
  /** Pre-formatted warehouse address from tenant settings, used when ShippingPoint isn't a known SAP code. */
  warehouseAddress?: string;
  routeCode?: string;
  deliveryDate?: string;
  grossWeightKg?: number;
  itemsCount?: number;
  assignment?: DriverAssignment | null;
  /** Live ETA from the rendered route — used as a fallback when the assignment has no stored ETA. */
  routeSummary?: { distance: string; duration: string } | null;
}

function formatAssignedAt(iso?: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-GB', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

interface AddressBlockProps {
  kind: 'from' | 'to';
  code?: string;
  fallback?: string;
}

function AddressBlock({ kind, code, fallback }: AddressBlockProps) {
  const isFrom = kind === 'from';
  const resolved = resolveSapAddress(code);
  const useFallback = !resolved || (!resolved.street && !resolved.city);

  return (
    <div className="relative pl-6">
      {/* Pin marker */}
      <div className={`absolute left-0 top-1 flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-bold ${
        isFrom ? 'bg-green-500/20 text-green-400 ring-1 ring-green-500/40' : 'bg-red-500/20 text-red-400 ring-1 ring-red-500/40'
      }`}>
        {isFrom ? 'A' : 'B'}
      </div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-medium">
        {isFrom ? 'Ship-From' : 'Ship-To'}
      </div>
      <div className="mt-1 text-sm font-semibold text-foreground flex items-center gap-2">
        <span className="font-mono text-xs text-indigo-400">{code ?? '—'}</span>
        {resolved?.label && <span className="text-xs text-muted-foreground font-normal">· {resolved.label}</span>}
      </div>
      {useFallback ? (
        <div className="text-xs text-muted-foreground mt-1">{fallback ?? '—'}</div>
      ) : (
        <>
          <div className="text-xs text-foreground mt-1">{resolved!.street}</div>
          <div className="text-xs text-muted-foreground">{resolved!.city}{resolved!.country ? `, ${resolved!.country}` : ''}</div>
        </>
      )}
    </div>
  );
}

export function DeliveryRouteCard({
  shipFromCode,
  shipToCode,
  warehouseAddress,
  routeCode,
  deliveryDate,
  grossWeightKg,
  itemsCount,
  assignment,
  routeSummary,
}: DeliveryRouteCardProps) {
  const etaDuration = assignment?.EstimatedDuration || routeSummary?.duration;
  const etaDistance = assignment?.EstimatedDistance || routeSummary?.distance;
  const qrImage = assignment?.QRCodeImage;
  const qrUrl = assignment?.QRCodeUrl;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 bg-card border border-border rounded-xl overflow-hidden">
      {/* LEFT: Route endpoints */}
      <div className="p-5 lg:border-r border-border">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <MapPin size={14} className="text-indigo-400" />
          Route Endpoints
        </h3>

        <div className="space-y-5">
          <AddressBlock kind="from" code={shipFromCode} fallback={warehouseAddress} />

          {/* Connector line */}
          <div className="ml-2 border-l-2 border-dashed border-border h-4" />

          <AddressBlock kind="to" code={shipToCode} />
        </div>

        {/* Meta strip */}
        <div className="mt-5 pt-4 border-t border-border/40 grid grid-cols-3 gap-3 text-[11px]">
          <div>
            <div className="text-muted-foreground">Route</div>
            <div className="text-foreground font-mono mt-0.5">{routeCode ?? '—'}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Date</div>
            <div className="text-foreground mt-0.5">
              {deliveryDate ? new Date(deliveryDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">Weight</div>
            <div className="text-foreground mt-0.5">
              {grossWeightKg !== undefined ? `${grossWeightKg} kg` : '—'}
              {itemsCount !== undefined && <span className="text-muted-foreground"> · {itemsCount} items</span>}
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT: Driver & ETA */}
      <div className="p-5 bg-card/40">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Truck size={14} className="text-indigo-400" />
          Driver & ETA
        </h3>

        {!assignment ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Package2 size={28} className="text-muted-foreground/40 mb-2" />
            <p className="text-xs text-muted-foreground">No driver assigned yet.</p>
            <p className="text-[11px] text-muted-foreground/70 mt-1">Use the Assign Driver button above.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs text-green-400">
              <CheckCircle2 size={12} /> Assigned
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex items-center gap-2">
                <Truck size={12} className="text-indigo-400 shrink-0" />
                <span className="text-foreground font-medium">{assignment.DriverName || '—'}</span>
              </div>
              <div className="flex items-center gap-2 pl-5 text-muted-foreground">
                {assignment.MobileNumber || '—'}
              </div>
              <div className="flex items-center gap-2 pl-5 text-muted-foreground font-mono">
                {assignment.TruckRegistration || '—'}
              </div>
            </div>

            {(etaDuration || etaDistance) && (
              <div className="flex items-center gap-2 text-xs bg-indigo-500/10 border border-indigo-500/20 rounded-lg px-3 py-2">
                <Clock size={12} className="text-indigo-400 shrink-0" />
                <span className="text-foreground font-medium">{etaDuration ?? '—'}</span>
                {etaDistance && <span className="text-muted-foreground">· {etaDistance}</span>}
              </div>
            )}

            <div className="text-[11px] text-muted-foreground">
              Assigned {formatAssignedAt(assignment.AssignedAt)}
            </div>

            {qrImage && (
              <div className="space-y-2">
                <div className="flex justify-center bg-white rounded-lg p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrImage.startsWith('data:') ? qrImage : `data:image/png;base64,${qrImage}`}
                    alt="Driver QR Code"
                    className="w-28 h-28 object-contain"
                  />
                </div>
                {qrUrl && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-[11px] h-7"
                      onClick={() => navigator.clipboard.writeText(qrUrl)}
                    >
                      Copy Link
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-[11px] h-7"
                      onClick={() => window.open(qrUrl, '_blank')}
                    >
                      Open
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
