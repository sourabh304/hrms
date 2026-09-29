'use client';

import { format, parseISO } from 'date-fns';
import { ArrowRight, Cake, CheckCircle2, Circle, FileCheck2, Gift, ListChecks, PartyPopper, Target, Users } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { StatusBadge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, EmptyState, PersonCell, Progress, Skeleton } from '@/components/ui/misc';
import { useAnnouncements } from '@/features/announcements/api';
import { useRoster } from '@/features/attendance/api';
import { useAcknowledge, usePendingAcknowledgments } from '@/features/documents/api';
import { useCelebrations } from '@/features/employees/api';
import { useUpcomingHolidays } from '@/features/holidays/api';
import { useMyTasks, useUpdateTask } from '@/features/onboarding/api';
import { useGoals } from '@/features/performance/api';
import { useInbox } from '@/features/workflow/api';
import { WORKFLOW_LABELS } from '@/features/workflow/types';
import { cn, formatDate, humanize, timeAgo, todayISO } from '@/lib/utils';

const ViewAll = ({ href, label = 'View all' }: { href: string; label?: string }) => (
  <Link href={href} className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
    {label} <ArrowRight className="h-3 w-3" />
  </Link>
);

export function ApprovalsWidget() {
  const { data = [], isLoading } = useInbox();
  return (
    <Card>
      <CardHeader title="Pending approvals" description={`${data.length} waiting on you`} action={<ViewAll href="/inbox" label="Open inbox" />} />
      {isLoading ? (
        <Skeleton className="m-5 h-32" />
      ) : !data.length ? (
        <EmptyState icon={CheckCircle2} title="You're all caught up" className="py-8" />
      ) : (
        <ul className="divide-y divide-border">
          {data.slice(0, 4).map(({ request: r, step }) => (
            <li key={r.id}>
              <Link href="/inbox" className="flex items-center gap-3 px-5 py-3 hover:bg-muted/50">
                <Avatar name={r.requester.fullName} src={r.requester.avatarUrl} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{r.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {r.requester.fullName} · {WORKFLOW_LABELS[r.type]} · {step.label}
                  </p>
                </div>
                <span className="shrink-0 text-[11px] text-muted-foreground">{timeAgo(r.createdAt)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function TeamTodayWidget() {
  const { data, isLoading } = useRoster(todayISO(), 'team');
  const out = data?.rows.filter((r) => r.status === 'ON_LEAVE' || r.status === 'ABSENT' || r.status === 'NOT_MARKED') ?? [];
  return (
    <Card>
      <CardHeader title="Your team today" action={<ViewAll href="/attendance" />} />
      {isLoading || !data ? (
        <Skeleton className="m-5 h-28" />
      ) : (
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              ['In', data.summary.present, 'text-success'],
              ['On leave', data.summary.onLeave, 'text-info'],
              ['Not in yet', data.summary.absent + data.summary.notMarked, 'text-muted-foreground'],
            ].map(([label, n, cls]) => (
              <div key={label as string} className="rounded-lg bg-muted py-2">
                <p className={cn('text-xl font-semibold', cls as string)}>{n}</p>
                <p className="text-[11px] text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
          <ul className="space-y-2">
            {out.slice(0, 4).map((r) => (
              <li key={r.employee.id} className="flex items-center justify-between">
                <PersonCell name={r.employee.fullName} src={r.employee.avatarUrl} size="xs" subtitle={r.employee.designation} />
                <StatusBadge status={r.status} label={r.leaveType ?? undefined} />
              </li>
            ))}
            {!out.length && <p className="text-center text-xs text-muted-foreground">Everyone is in 🎯</p>}
          </ul>
        </CardContent>
      )}
    </Card>
  );
}

export function MyTasksWidget() {
  const { data = [], isLoading } = useMyTasks();
  const update = useUpdateTask();
  const today = todayISO();
  return (
    <Card>
      <CardHeader title="My tasks" description="Onboarding & offboarding checklist items assigned to you" action={<ViewAll href="/onboarding" />} />
      {isLoading ? (
        <Skeleton className="m-5 h-28" />
      ) : !data.length ? (
        <EmptyState icon={ListChecks} title="No open tasks" className="py-8" />
      ) : (
        <ul className="divide-y divide-border">
          {data.slice(0, 5).map((t) => (
            <li key={t.id} className="flex items-start gap-3 px-5 py-3">
              <button
                onClick={async () => {
                  await update.mutateAsync({ id: t.id, status: 'DONE' });
                  toast.success('Task completed');
                }}
                className="mt-0.5 cursor-pointer text-muted-foreground hover:text-success"
                aria-label={`Mark "${t.title}" done`}
              >
                <Circle className="h-4 w-4" />
              </button>
              <div className="min-w-0 flex-1">
                <p className="text-sm">{t.title}</p>
                <p className="text-xs text-muted-foreground">
                  {t.journey?.employee.fullName} · {humanize(t.journey?.type)} ·{' '}
                  <span className={cn(t.dueDate < today && 'font-medium text-danger')}>due {formatDate(t.dueDate, 'MMM d')}</span>
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function GoalsWidget() {
  const { data = [], isLoading } = useGoals('me');
  return (
    <Card>
      <CardHeader title="My goals" action={<ViewAll href="/performance" />} />
      {isLoading ? (
        <Skeleton className="m-5 h-28" />
      ) : !data.length ? (
        <EmptyState icon={Target} title="No goals set yet" className="py-8" />
      ) : (
        <CardContent className="space-y-4">
          {data.slice(0, 4).map((g) => (
            <div key={g.id}>
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <p className="truncate text-sm">{g.title}</p>
                <span className="tabular shrink-0 text-xs font-medium">{g.progress}%</span>
              </div>
              <Progress value={g.progress} tone={g.status === 'AT_RISK' ? 'warning' : g.status === 'OFF_TRACK' ? 'danger' : g.status === 'COMPLETED' ? 'success' : 'primary'} />
            </div>
          ))}
        </CardContent>
      )}
    </Card>
  );
}

export function AcknowledgmentsWidget() {
  const { data = [] } = usePendingAcknowledgments();
  const ack = useAcknowledge();
  if (!data.length) return null;
  return (
    <Card className="border-warning/40">
      <CardHeader title="Action required: policy acknowledgments" description="Please read and confirm these company policies" action={<ViewAll href="/documents" />} />
      <ul className="divide-y divide-border">
        {data.map((d) => (
          <li key={d.id} className="flex items-center gap-3 px-5 py-3">
            <FileCheck2 className="h-4 w-4 text-warning" />
            <span className="flex-1 text-sm">
              {d.title} <span className="text-xs text-muted-foreground">v{d.version}</span>
            </span>
            <button
              className="cursor-pointer text-xs font-medium text-primary hover:underline"
              onClick={async () => {
                await ack.mutateAsync(d.id);
                toast.success(`Acknowledged ${d.title}`);
              }}
            >
              I acknowledge
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function AnnouncementsWidget() {
  const { data = [], isLoading } = useAnnouncements();
  return (
    <Card>
      <CardHeader title="Announcements" action={<ViewAll href="/announcements" />} />
      {isLoading ? (
        <Skeleton className="m-5 h-32" />
      ) : (
        <ul className="divide-y divide-border">
          {data.slice(0, 3).map((a) => (
            <li key={a.id} className="px-5 py-3.5">
              <p className="text-sm font-medium">{a.title}</p>
              <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{a.content}</p>
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                {a.author?.fullName} · {timeAgo(a.publishedAt)}
              </p>
            </li>
          ))}
          {!data.length && <EmptyState title="No announcements" className="py-8" />}
        </ul>
      )}
    </Card>
  );
}

export function CelebrationsWidget() {
  const { data = [], isLoading } = useCelebrations(30);
  return (
    <Card>
      <CardHeader title="Celebrations" description="Next 30 days" />
      {isLoading ? (
        <Skeleton className="m-5 h-32" />
      ) : !data.length ? (
        <EmptyState icon={PartyPopper} title="No celebrations coming up" className="py-8" />
      ) : (
        <ul className="divide-y divide-border">
          {data.slice(0, 5).map((c) => (
            <li key={`${c.type}-${c.employee.id}`} className="flex items-center gap-3 px-5 py-2.5">
              <Avatar name={c.employee.fullName} src={c.employee.avatarUrl} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{c.employee.fullName}</p>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  {c.type === 'BIRTHDAY' ? <Cake className="h-3 w-3" /> : <Gift className="h-3 w-3" />}
                  {c.type === 'BIRTHDAY' ? 'Birthday' : `${c.years}-year work anniversary`}
                </p>
              </div>
              <span className="text-xs font-medium">{c.date === todayISO() ? 'Today 🎉' : format(parseISO(c.date), 'MMM d')}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function HolidaysWidget() {
  const { data = [], isLoading } = useUpcomingHolidays(4);
  return (
    <Card>
      <CardHeader title="Upcoming holidays" action={<ViewAll href="/holidays" />} />
      {isLoading ? (
        <Skeleton className="m-5 h-28" />
      ) : (
        <ul className="divide-y divide-border">
          {data.map((h) => (
            <li key={h.id} className="flex items-center gap-3 px-5 py-2.5">
              <div className="w-10 shrink-0 rounded-md bg-primary-soft py-1 text-center text-primary-soft-foreground">
                <p className="text-[9px] font-semibold uppercase">{format(parseISO(h.date), 'MMM')}</p>
                <p className="text-sm leading-none font-semibold">{format(parseISO(h.date), 'd')}</p>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{h.name}</p>
                <p className="text-xs text-muted-foreground">
                  {format(parseISO(h.date), 'EEEE')} · {h.location?.name ?? 'All locations'}
                </p>
              </div>
            </li>
          ))}
          {!data.length && <EmptyState icon={Users} title="No upcoming holidays" className="py-8" />}
        </ul>
      )}
    </Card>
  );
}
