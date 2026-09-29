'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from '@/components/brand';
import { useAccess } from '@/features/auth/api';
import { useInboxCount } from '@/features/workflow/api';
import { cn } from '@/lib/utils';
import { visibleNavigation } from './nav-config';

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { user } = useAccess();
  const { data: inbox } = useInboxCount();
  const sections = visibleNavigation(user?.permissions ?? []);

  return (
    <aside className="flex h-full w-64 flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 shrink-0 items-center border-b border-sidebar-border px-5">
        <Link href="/dashboard" onClick={onNavigate}>
          <Logo inverted />
        </Link>
      </div>

      <nav className="scrollbar-thin flex-1 space-y-5 overflow-y-auto px-3 py-4" aria-label="Main">
        {sections.map((section) => (
          <div key={section.title}>
            <p className="mb-1.5 px-3 text-[10px] font-semibold tracking-[0.14em] text-sidebar-muted uppercase">{section.title}</p>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                const count = item.badge === 'inbox' ? (inbox?.count ?? 0) : 0;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'group flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors',
                        active ? 'bg-sidebar-active text-white' : 'text-sidebar-foreground/80 hover:bg-sidebar-active/60 hover:text-white',
                      )}
                    >
                      <item.icon className={cn('h-4 w-4 shrink-0', active ? 'text-indigo-300' : 'text-sidebar-muted group-hover:text-sidebar-foreground')} />
                      <span className="flex-1 truncate">{item.label}</span>
                      {count > 0 && (
                        <span className="rounded-full bg-primary px-1.5 py-px text-[10px] font-semibold text-white tabular">{count}</span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-sidebar-border px-5 py-3 text-[11px] text-sidebar-muted">
        Segue HRMS · v1.0
      </div>
    </aside>
  );
}
