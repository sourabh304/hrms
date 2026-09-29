'use client';

import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/misc';
import { useBalances } from '../api';

export function BalanceCards({ compact }: { compact?: boolean }) {
  const { data, isLoading } = useBalances();
  if (isLoading) return <Skeleton className="h-28" />;
  const balances = (data ?? []).filter((b) => b.leaveType.isPaid && (!compact || b.allocated + b.carriedForward > 0));
  const shown = compact ? balances.slice(0, 4) : balances;

  return (
    <div className={compact ? 'grid grid-cols-2 gap-3' : 'grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5'}>
      {shown.map((b) => {
        const total = b.allocated + b.carriedForward;
        const pct = total ? (b.available / total) * 100 : 0;
        return (
          <Card key={b.id} className="p-4">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: b.leaveType.color }} />
              <p className="truncate text-xs font-medium text-muted-foreground">{b.leaveType.name}</p>
            </div>
            <p className="mt-2 text-2xl font-semibold">
              {b.available}
              <span className="ml-1 text-sm font-normal text-muted-foreground">/ {total} days</span>
            </p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: b.leaveType.color }} />
            </div>
            {!compact && (
              <p className="mt-2 text-[11px] text-muted-foreground">
                {b.used} used · {b.pending} pending{b.carriedForward ? ` · ${b.carriedForward} carried` : ''}
              </p>
            )}
          </Card>
        );
      })}
    </div>
  );
}
