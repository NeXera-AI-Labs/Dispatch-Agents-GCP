import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 text-sm font-medium text-indigo-400 tracking-widest uppercase">NeXera Dispatch</div>
      <h1 className="text-5xl font-black text-white mb-4 max-w-2xl leading-tight">
        One platform. Every ERP. Every fleet.
      </h1>
      <p className="text-lg text-muted-foreground mb-10 max-w-xl">
        AI-powered outbound delivery dispatch — connect SAP, Odoo or Oracle and give your team one intelligent workspace.
      </p>
      <div className="flex gap-4">
        <Link href="/signup" className={cn(buttonVariants({ size: 'lg' }), 'bg-indigo-600 hover:bg-indigo-700')}>
          Start Free Trial
        </Link>
        <Link href="/login" className={cn(buttonVariants({ variant: 'outline', size: 'lg' }))}>
          Sign In
        </Link>
      </div>
    </main>
  );
}
