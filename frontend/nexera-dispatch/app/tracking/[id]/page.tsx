'use client';
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { CheckCircle2, MapPin, Navigation, Truck, Package, AlertTriangle } from 'lucide-react';

interface Assignment {
  ID: string;
  DeliveryDocument: string;
  DriverName: string;
  MobileNumber: string;
  TruckRegistration: string;
  Status: 'ASSIGNED' | 'IN_TRANSIT' | 'DELIVERED';
  AssignedAt: string;
  CurrentLat?: number;
  CurrentLng?: number;
  LastGpsAt?: string;
  EstimatedDistance?: string;
  EstimatedDuration?: string;
}

const CAP = process.env.NEXT_PUBLIC_CAP_URL || 'http://localhost:4004';

export default function DriverTrackingPage() {
  const params = useParams();
  const id = params?.id as string;

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [error, setError] = useState('');
  const [gpsText, setGpsText] = useState('Waiting for GPS signal…');
  const [gpsSent, setGpsSent] = useState(0);
  const [gpsWarning, setGpsWarning] = useState(false);
  const [delivered, setDelivered] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [lastSent, setLastSent] = useState('');
  const posRef = useRef<GeolocationCoordinates | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const watchRef = useRef<number | null>(null);

  // Load assignment
  useEffect(() => {
    if (!id) return;
    fetch(`${CAP}/odata/v4/tracking/getAssignment(assignmentId='${id}')`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(a => {
        setAssignment(a);
        if (a.Status === 'DELIVERED') setDelivered(true);
      })
      .catch(() => setError('Assignment not found. The link may be invalid or expired.'));
  }, [id]);

  // Start GPS once assignment loads
  useEffect(() => {
    if (!assignment || delivered) return;

    const sendLocation = (pos: GeolocationCoordinates) => {
      fetch(`${CAP}/odata/v4/tracking/updateLocation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignmentId: id,
          latitude: pos.latitude,
          longitude: pos.longitude,
          speed: pos.speed ?? null,
          accuracy: pos.accuracy ?? null,
        }),
      }).catch(() => {});
      setGpsSent(n => n + 1);
      setLastSent(new Date().toLocaleTimeString());
    };

    if (navigator.geolocation) {
      watchRef.current = navigator.geolocation.watchPosition(
        pos => {
          posRef.current = pos.coords;
          setGpsText(`${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`);
          setGpsWarning(false);
          sendLocation(pos.coords);
        },
        () => setGpsWarning(true),
        { enableHighAccuracy: true }
      );
    } else {
      setGpsWarning(true);
    }

    const pollMs = 60000;
    intervalRef.current = setInterval(() => {
      if (posRef.current) sendLocation(posRef.current);
    }, pollMs);

    return () => {
      if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [assignment, delivered, id]);

  function simulateGps() {
    const lat = 12.9716 + (Math.random() - 0.5) * 0.02;
    const lng = 77.5946 + (Math.random() - 0.5) * 0.02;
    const coords = { latitude: lat, longitude: lng, speed: 40, accuracy: 10 } as GeolocationCoordinates;
    posRef.current = coords;
    setGpsText(`${lat.toFixed(6)}, ${lng.toFixed(6)} (simulated)`);
    setGpsWarning(false);
    fetch(`${CAP}/odata/v4/tracking/updateLocation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assignmentId: id, latitude: lat, longitude: lng, speed: 40, accuracy: 10 }),
    }).catch(() => {});
    setGpsSent(n => n + 1);
    setLastSent(new Date().toLocaleTimeString());
  }

  async function confirmDelivery() {
    if (!confirm('Mark this delivery as completed?')) return;
    setConfirming(true);
    try {
      const r = await fetch(`${CAP}/odata/v4/tracking/confirmDelivery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentId: id }),
      });
      if (!r.ok) throw new Error('Failed');
      setDelivered(true);
      if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    } catch {
      alert('Failed to confirm delivery. Please try again.');
    } finally {
      setConfirming(false);
    }
  }

  const statusColors: Record<string, string> = {
    ASSIGNED: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    IN_TRANSIT: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    DELIVERED: 'bg-green-500/20 text-green-300 border-green-500/30',
  };

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        <div className="text-center space-y-3">
          <AlertTriangle size={40} className="text-red-400 mx-auto" />
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-slate-400 text-sm">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
              <Truck size={16} className="text-indigo-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400">NeXera Dispatch</p>
              <p className="text-sm font-bold font-mono">{assignment.DeliveryDocument}</p>
            </div>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full border font-medium ${statusColors[assignment.Status] ?? statusColors.ASSIGNED}`}>
            {assignment.Status.replace('_', ' ')}
          </span>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">

        {/* Delivered banner */}
        {delivered && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex items-center gap-3">
            <CheckCircle2 size={20} className="text-green-400 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-green-300">Delivery Complete!</p>
              <p className="text-xs text-slate-400">Thank you. You can now close this page.</p>
            </div>
          </div>
        )}

        {/* Delivery info */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Package size={14} className="text-indigo-400" />
            <h2 className="text-sm font-semibold">Delivery Details</h2>
          </div>
          {[
            ['Driver', assignment.DriverName],
            ['Mobile', assignment.MobileNumber],
            ['Truck', assignment.TruckRegistration],
            ['Assigned At', new Date(assignment.AssignedAt).toLocaleString()],
            assignment.EstimatedDistance && ['Est. Distance', assignment.EstimatedDistance],
            assignment.EstimatedDuration && ['Est. Duration', assignment.EstimatedDuration],
          ].filter(Boolean).map(([label, value]) => (
            <div key={label as string} className="flex justify-between text-xs border-b border-slate-800/50 pb-2 last:border-0 last:pb-0">
              <span className="text-slate-400">{label}</span>
              <span className="text-slate-200 font-medium">{value}</span>
            </div>
          ))}
        </div>

        {/* GPS section */}
        {!delivered && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Navigation size={14} className="text-indigo-400" />
              <h2 className="text-sm font-semibold">GPS Tracking</h2>
            </div>

            {gpsWarning && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 text-xs text-yellow-300">
                Location access required. Please enable GPS or use Simulate GPS below.
              </div>
            )}

            <div className="bg-slate-800/50 rounded-lg px-3 py-2.5 font-mono text-xs text-slate-300 flex items-center gap-2">
              <MapPin size={12} className="text-indigo-400 shrink-0" />
              {gpsText}
            </div>

            {gpsSent > 0 && (
              <p className="text-xs text-slate-500">Updates sent: {gpsSent} · Last: {lastSent}</p>
            )}

            <div className="flex gap-2">
              {gpsWarning && (
                <button
                  onClick={simulateGps}
                  className="flex-1 text-xs py-2 px-3 bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 rounded-lg hover:bg-indigo-600/30 transition-colors"
                >
                  Simulate GPS (Testing)
                </button>
              )}
              <button
                onClick={confirmDelivery}
                disabled={confirming}
                className="flex-1 text-xs py-2 px-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors font-medium"
              >
                {confirming ? 'Confirming…' : 'Confirm Delivery'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
