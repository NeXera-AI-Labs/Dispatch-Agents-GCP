'use client';
import { useState } from 'react';
import { Loader2, Truck } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { assignDriver } from '@/lib/api';

interface AssignDriverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deliveryDoc: string;
  onAssigned: (qrImage: string, qrUrl: string, assignmentId?: string) => void;
}

export function AssignDriverDialog({ open, onOpenChange, deliveryDoc, onAssigned }: AssignDriverDialogProps) {
  const [driverName, setDriverName] = useState('');
  const [mobile, setMobile] = useState('');
  const [truck, setTruck] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!driverName || !mobile) return;
    setLoading(true); setError('');
    try {
      const res = await assignDriver(deliveryDoc, mobile, driverName, truck);
      onAssigned(res.QRCodeImage, res.QRCodeUrl, res.ID);
      setDriverName(''); setMobile(''); setTruck('');
      onOpenChange(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to assign driver');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck size={16} className="text-indigo-400" />
            Assign Driver
          </DialogTitle>
          <DialogDescription>
            Delivery <span className="font-mono text-foreground">{deliveryDoc}</span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="driver-name">Driver Name</Label>
            <Input
              id="driver-name"
              value={driverName}
              onChange={e => setDriverName(e.target.value)}
              placeholder="John Smith"
              required
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="driver-mobile">Mobile Number</Label>
            <Input
              id="driver-mobile"
              value={mobile}
              onChange={e => setMobile(e.target.value)}
              placeholder="+49 123 456789"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="truck-reg">Truck Registration</Label>
            <Input
              id="truck-reg"
              value={truck}
              onChange={e => setTruck(e.target.value)}
              placeholder="HH-AB 1234"
            />
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700"
              disabled={loading || !driverName || !mobile}
            >
              {loading ? (
                <><Loader2 size={14} className="mr-2 animate-spin" />Assigning…</>
              ) : (
                'Assign & Generate QR'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
