'use client';

import { CheckCircle2, Circle, MinusCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader } from '@/components/ui/card';
import { PersonCell, Progress } from '@/components/ui/misc';
import { useAccess } from '@/features/auth/api';
import { cn, formatDate, humanize, todayISO } from '@/lib/utils';
import { useUpdateTask, type Journey } from '../api';

const ASSIGNEE_LABEL = { HR: 'HR', IT: 'IT', FINANCE: 'Finance', MANAGER: 'Manager', EMPLOYEE: 'Employee' } as const;

/** Checklist grouped by category with inline completion. */
export function JourneyChecklist({ journey }: { journey: Journey }) {
  const update = useUpdateTask();
  const { user } = useAccess();
  const today = todayISO();
  const groups = journey.tasks.reduce<Record<string, Journey['tasks']>>((m, t) => {
    (m[t.category] ??= []).push(t);
    return m;
  }, {});

  const canAct = (t: Journey['tasks'][number]) =>
    !!user &&
    (user.permissions.includes('onboarding:manage') ||
      t.assigneeEmployeeId === user.employee?.id ||
      (!!t.assigneeRole && user.roles.includes(t.assigneeRole as never)));

  return (
    <Card>
      <CardHeader
        title={<PersonCell name={journey.employee.fullName} src={journey.employee.avatarUrl} subtitle={`${journey.employee.designation?.title ?? ''} · ${journey.templateName}`} />}
        action={
          <div className="w-40 text-right">
            <p className="text-xs text-muted-foreground">{journey.completedTasks}/{journey.totalTasks} tasks · {journey.progress}%</p>
            <Progress value={journey.progress} tone={journey.progress === 100 ? 'success' : 'primary'} className="mt-1.5" />
          </div>
        }
      />
      <div className="divide-y divide-border">
        {Object.entries(groups).map(([category, tasks]) => (
          <div key={category} className="px-5 py-3">
            <p className="mb-2 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{category}</p>
            <ul className="space-y-1">
              {tasks.map((t) => {
                const done = t.status !== 'PENDING';
                const overdue = !done && t.dueDate < today;
                return (
                  <li key={t.id} className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-muted/50">
                    <button
                      disabled={!canAct(t) || update.isPending}
                      onClick={async () => {
                        await update.mutateAsync({ id: t.id, status: done ? 'PENDING' : 'DONE' });
                        toast.success(done ? 'Task reopened' : 'Task completed');
                      }}
                      className="cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label={done ? `Reopen ${t.title}` : `Complete ${t.title}`}
                    >
                      {t.status === 'DONE' ? <CheckCircle2 className="h-5 w-5 text-success" /> : t.status === 'SKIPPED' ? <MinusCircle className="h-5 w-5 text-muted-foreground" /> : <Circle className="h-5 w-5 text-muted-foreground" />}
                    </button>
                    <span className={cn('flex-1 text-sm', done && 'text-muted-foreground line-through')}>{t.title}</span>
                    <Badge variant={t.assigneeType === 'EMPLOYEE' ? 'primary' : 'neutral'}>{t.assigneeEmployee?.fullName ?? ASSIGNEE_LABEL[t.assigneeType] ?? humanize(t.assigneeType)}</Badge>
                    <span className={cn('w-20 text-right text-xs', overdue ? 'font-medium text-danger' : 'text-muted-foreground')}>{formatDate(t.dueDate, 'MMM d')}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </Card>
  );
}
