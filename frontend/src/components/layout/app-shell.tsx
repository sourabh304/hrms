'use client';

import { AlertTriangle, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { LogoMark } from '@/components/brand';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/misc';
import { useSession } from '@/features/auth/api';
import { CommandPalette } from './command-palette';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';

export function AppShell({ children }: { children: ReactNode }) {
  const { data: user, isLoading, error, refetch } = useSession();
  const [mobileNav, setMobileNav] = useState(false);
  const [palette, setPalette] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPalette((p) => !p);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (isLoading || (!user && !error)) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <LogoMark className="h-10 w-10" />
        <Spinner />
      </div>
    );
  }
  if (error || !user) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 text-center">
        <AlertTriangle className="h-8 w-8 text-warning" />
        <p className="text-sm text-muted-foreground">We couldn&apos;t load your session.</p>
        <Button variant="outline" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <div className="fixed inset-y-0 left-0 z-40 hidden md:block">
        <Sidebar />
      </div>
      {mobileNav && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-slate-950/60" onClick={() => setMobileNav(false)} />
          <div className="relative h-full w-64">
            <Sidebar onNavigate={() => setMobileNav(false)} />
            <Button variant="ghost" size="icon" className="absolute top-3 -right-12 text-white hover:bg-white/10" onClick={() => setMobileNav(false)} aria-label="Close navigation">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col md:pl-64">
        <Topbar onMenu={() => setMobileNav(true)} onSearch={() => setPalette(true)} />
        {user.mustChangePassword && (
          <div className="flex items-center gap-2 border-b border-warning/30 bg-warning-soft px-6 py-2 text-sm text-warning">
            <AlertTriangle className="h-4 w-4" /> You are using a temporary password.
            <Link href="/profile?tab=security" className="font-medium underline">
              Change it now
            </Link>
          </div>
        )}
        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
      {palette && <CommandPalette onClose={() => setPalette(false)} />}
    </div>
  );
}
