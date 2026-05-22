'use client';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface QrDisplayProps {
  qrImage: string;   // base64 or URL
  qrUrl: string;     // shareable link
}

export function QrDisplay({ qrImage, qrUrl }: QrDisplayProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-green-400">
        <CheckCircle2 size={14} /> Driver assigned successfully
      </div>
      <div className="flex justify-center bg-white rounded-xl p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrImage.startsWith('data:') ? qrImage : `data:image/png;base64,${qrImage}`} alt="Driver QR Code" className="w-40 h-40 object-contain" />
      </div>
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
    </div>
  );
}
