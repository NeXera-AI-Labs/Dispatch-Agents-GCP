'use client';
import { CheckCircle2, Truck, Clock, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { DriverAssignment } from '@/lib/types';

interface AssignmentCardProps {
  assignment: DriverAssignment;
}

function formatAssignedAt(iso?: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

export function AssignmentCard({ assignment }: AssignmentCardProps) {
  const qrImage = assignment.QRCodeImage;
  const qrUrl = assignment.QRCodeUrl;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-green-400">
        <CheckCircle2 size={14} /> Driver assigned
      </div>

      <div className="space-y-2 text-xs">
        <div className="flex items-center gap-2">
          <Truck size={12} className="text-indigo-400 shrink-0" />
          <span className="text-muted-foreground">Driver</span>
          <span className="text-foreground font-medium ml-auto">{assignment.DriverName || '—'}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 shrink-0" />
          <span className="text-muted-foreground">Mobile</span>
          <span className="text-foreground font-mono ml-auto">{assignment.MobileNumber || '—'}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 shrink-0" />
          <span className="text-muted-foreground">Truck</span>
          <span className="text-foreground font-mono ml-auto">{assignment.TruckRegistration || '—'}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock size={12} className="text-indigo-400 shrink-0" />
          <span className="text-muted-foreground">Assigned</span>
          <span className="text-foreground ml-auto">{formatAssignedAt(assignment.AssignedAt)}</span>
        </div>
        {assignment.EstimatedDuration && (
          <div className="flex items-center gap-2">
            <MapPin size={12} className="text-indigo-400 shrink-0" />
            <span className="text-muted-foreground">ETA</span>
            <span className="text-foreground ml-auto">
              {assignment.EstimatedDuration}
              {assignment.EstimatedDistance ? ` · ${assignment.EstimatedDistance}` : ''}
            </span>
          </div>
        )}
      </div>

      {qrImage && (
        <>
          <div className="flex justify-center bg-white rounded-xl p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrImage.startsWith('data:') ? qrImage : `data:image/png;base64,${qrImage}`}
              alt="Driver QR Code"
              className="w-40 h-40 object-contain"
            />
          </div>
          {qrUrl && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs"
                onClick={() => navigator.clipboard.writeText(qrUrl)}
              >
                Copy Link
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs"
                onClick={() => window.open(qrUrl, '_blank')}
              >
                Open Link
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
