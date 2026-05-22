interface KpiCardProps {
  label: string;
  value: number | string;
  accent?: 'default' | 'indigo' | 'yellow' | 'green' | 'red';
}

export function KpiCard({ label, value, accent = 'default' }: KpiCardProps) {
  const colorMap = {
    default: 'text-foreground',
    indigo: 'text-indigo-400',
    yellow: 'text-yellow-400',
    green: 'text-green-400',
    red: 'text-red-400',
  };
  return (
    <div className="bg-card border border-border rounded-xl px-5 py-4">
      <div className={`text-3xl font-black ${colorMap[accent]}`}>{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  );
}
