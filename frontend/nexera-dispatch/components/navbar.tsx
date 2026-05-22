'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bot, LogOut, Warehouse } from 'lucide-react';
import { clearToken, getCurrentUser } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import type { AuthUser } from '@/lib/types';

interface NavbarProps {
  warehouseNumber?: string;
  warehouseLabel?: string;
  onAskAI?: () => void;
}

export function Navbar({ warehouseNumber, warehouseLabel, onAskAI }: NavbarProps) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    setUser(getCurrentUser());
  }, []);

  function handleLogout() {
    clearToken();
    router.push('/login');
  }

  return (
    <nav className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center px-6 gap-4">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-1.5 font-bold text-base">
          <span className="text-indigo-400">NeXera</span>
          <span className="text-foreground">Dispatch</span>
        </Link>

        {/* Warehouse label */}
        {warehouseNumber && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-secondary px-2.5 py-1 rounded-md border border-border">
            <Warehouse size={12} />
            <span>WH-{warehouseNumber}{warehouseLabel ? ` · ${warehouseLabel}` : ''}</span>
          </div>
        )}

        <div className="flex-1" />

        {/* Ask AI button */}
        {onAskAI && (
          <Button
            variant="outline"
            size="sm"
            onClick={onAskAI}
            className="gap-1.5 text-indigo-400 border-indigo-400/30 hover:bg-indigo-400/10 hover:text-indigo-300"
          >
            <Bot size={14} />
            Ask AI
          </Button>
        )}

        {/* User info + logout */}
        <div className="flex items-center gap-3">
          {user && (
            <span className="text-xs text-muted-foreground hidden sm:block">{user.email}</span>
          )}
          <Button variant="ghost" size="icon" onClick={handleLogout} className="h-8 w-8 text-muted-foreground hover:text-foreground">
            <LogOut size={14} />
          </Button>
        </div>
      </div>
    </nav>
  );
}
