'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface TabItem {
  value: string;
  label: ReactNode;
  count?: number;
  hidden?: boolean;
}

export function Tabs({ tabs, value, onChange, className }: { tabs: TabItem[]; value: string; onChange: (value: string) => void; className?: string }) {
  return (
    <div className={cn('scrollbar-thin -mb-px flex gap-1 overflow-x-auto border-b border-border', className)} role="tablist">
      {tabs
        .filter((t) => !t.hidden)
        .map((t) => {
          const active = t.value === value;
          return (
            <button
              key={t.value}
              role="tab"
              aria-selected={active}
              onClick={() => onChange(t.value)}
              className={cn(
                'flex cursor-pointer items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors',
                active ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {t.label}
              {t.count !== undefined && (
                <span className={cn('rounded-full px-1.5 py-px text-[10px] tabular', active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
    </div>
  );
}

/** Pill-style segmented control for filters. */
export function Segmented({ options, value, onChange }: { options: { value: string; label: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="inline-flex rounded-lg border border-border bg-muted p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'cursor-pointer rounded-md px-3 py-1 text-xs font-medium transition-colors',
            o.value === value ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
