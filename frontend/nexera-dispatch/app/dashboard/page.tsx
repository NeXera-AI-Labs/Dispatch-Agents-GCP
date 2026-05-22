'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';

export default function DashboardPage() {
  const router = useRouter();
  useEffect(() => {
    const user = getCurrentUser();
    if (!user) { router.replace('/login'); return; }
    if (user.role === 'it_admin') router.replace('/dashboard/admin');
    else if (user.role === 'wh_manager') router.replace('/dashboard/warehouse');
    else router.replace('/dashboard/dispatch');
  }, [router]);
  return (
    <main className="min-h-screen flex items-center justify-center">
      <p className="text-muted-foreground">Loading…</p>
    </main>
  );
}
