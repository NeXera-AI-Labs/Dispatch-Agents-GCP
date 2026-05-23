export type DeliveryStatus = 'Not Assigned' | 'On the Way' | 'Delivered';

const styles: Record<DeliveryStatus, string> = {
  'Not Assigned': 'bg-slate-500/10 text-slate-300 border border-slate-500/20',
  'On the Way':   'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
  'Delivered':    'bg-green-500/10 text-green-400 border border-green-500/20',
};

export function DeliveryStatusBadge({ status }: { status: DeliveryStatus }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
      {status}
    </span>
  );
}
