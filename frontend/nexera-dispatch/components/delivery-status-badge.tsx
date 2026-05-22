export type DeliveryStatus = 'Open' | 'In Transit' | 'Delayed' | 'Delivered';

const styles: Record<DeliveryStatus, string> = {
  'Open': 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  'In Transit': 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
  'Delayed': 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
  'Delivered': 'bg-green-500/10 text-green-400 border border-green-500/20',
};

export function DeliveryStatusBadge({ status }: { status: DeliveryStatus }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
      {status}
    </span>
  );
}
