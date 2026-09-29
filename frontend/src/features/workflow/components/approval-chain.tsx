import { Check, Clock, MinusCircle, X } from 'lucide-react';
import { cn, formatDateTime, humanize } from '@/lib/utils';
import type { ApprovalStep } from '../types';

const STYLE: Record<ApprovalStep['status'], { icon: typeof Check; cls: string }> = {
  APPROVED: { icon: Check, cls: 'bg-success-soft text-success' },
  REJECTED: { icon: X, cls: 'bg-danger-soft text-danger' },
  PENDING: { icon: Clock, cls: 'bg-warning-soft text-warning' },
  WAITING: { icon: Clock, cls: 'bg-muted text-muted-foreground' },
  SKIPPED: { icon: MinusCircle, cls: 'bg-muted text-muted-foreground' },
};

/** Vertical timeline of an approval request's steps. */
export function ApprovalChain({ steps, submittedAt }: { steps: ApprovalStep[]; submittedAt?: string }) {
  return (
    <ol className="space-y-0">
      {submittedAt && (
        <li className="relative flex gap-3 pb-4">
          <span className="absolute top-7 left-3.5 h-full w-px bg-border" />
          <span className="relative z-10 flex h-7 w-7 items-center justify-center rounded-full bg-primary-soft text-primary-soft-foreground">
            <Check className="h-3.5 w-3.5" />
          </span>
          <div className="pt-0.5">
            <p className="text-sm font-medium">Submitted</p>
            <p className="text-xs text-muted-foreground">{formatDateTime(submittedAt)}</p>
          </div>
        </li>
      )}
      {steps.map((s, i) => {
        const { icon: Icon, cls } = STYLE[s.status];
        const approver = s.actedBy?.fullName ?? s.approverEmployee?.fullName ?? (s.approverRole ? `Any ${humanize(s.approverRole)}` : '—');
        return (
          <li key={s.id} className="relative flex gap-3 pb-4 last:pb-0">
            {i < steps.length - 1 && <span className="absolute top-7 left-3.5 h-full w-px bg-border" />}
            <span className={cn('relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full', cls)}>
              <Icon className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0 pt-0.5">
              <p className="text-sm font-medium">
                {s.label} <span className="font-normal text-muted-foreground">· {humanize(s.status)}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                {approver}
                {s.actedAt && ` · ${formatDateTime(s.actedAt)}`}
              </p>
              {s.comment && <p className="mt-1 rounded-md bg-muted px-2 py-1 text-xs">“{s.comment}”</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
