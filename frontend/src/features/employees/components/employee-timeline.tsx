'use client';

import { ArrowUpRight, Banknote, Flag, LogOut, Repeat, UserPlus, Users } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/card';
import { EmptyState, Skeleton } from '@/components/ui/misc';
import { formatDate } from '@/lib/utils';
import { useTimeline } from '../api';
import type { EmploymentEvent } from '../types';

const ICONS: Record<EmploymentEvent['type'], typeof Flag> = {
  HIRE: UserPlus,
  PROMOTION: ArrowUpRight,
  TRANSFER: Repeat,
  MANAGER_CHANGE: Users,
  STATUS_CHANGE: Flag,
  COMPENSATION_CHANGE: Banknote,
  EXIT: LogOut,
};

export function EmployeeTimeline({ employeeId }: { employeeId: string }) {
  const { data, isLoading } = useTimeline(employeeId);
  return (
    <Card>
      <CardHeader title="Job history" description="Hires, promotions, transfers and status changes." />
      {isLoading && <Skeleton className="m-5 h-40" />}
      {data && !data.length && <EmptyState title="No history yet" />}
      <ol className="relative px-5 py-4">
        {data?.map((e, i) => {
          const Icon = ICONS[e.type];
          return (
            <li key={e.id} className="relative flex gap-4 pb-6 last:pb-0">
              {i < data.length - 1 && <span className="absolute top-8 left-4 h-full w-px bg-border" />}
              <span className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary-soft-foreground">
                <Icon className="h-4 w-4" />
              </span>
              <div className="pt-1">
                <p className="text-sm font-medium">{e.summary}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{formatDate(e.effectiveDate)}</p>
                {typeof e.details?.note === 'string' && e.details.note && <p className="mt-1 text-xs text-muted-foreground italic">“{e.details.note}”</p>}
              </div>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
