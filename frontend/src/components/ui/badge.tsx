import type { ReactNode } from 'react';
import { cn, humanize } from '@/lib/utils';

const variants = {
  neutral: 'bg-muted text-muted-foreground',
  primary: 'bg-primary-soft text-primary-soft-foreground',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  info: 'bg-info-soft text-info',
} as const;

export type BadgeVariant = keyof typeof variants;

export function Badge({ children, variant = 'neutral', className, dot }: { children: ReactNode; variant?: BadgeVariant; className?: string; dot?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap', variants[variant], className)}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

const STATUS_VARIANTS: Record<string, BadgeVariant> = {
  // generic
  ACTIVE: 'success', APPROVED: 'success', COMPLETED: 'success', PAID: 'success', REIMBURSED: 'success', DONE: 'success', RESOLVED: 'success', HIRED: 'success', PRESENT: 'success', OPEN: 'info', PUBLISHED: 'success', AVAILABLE: 'success', ON_TRACK: 'success',
  PENDING: 'warning', SUBMITTED: 'warning', PENDING_APPROVAL: 'warning', IN_PROGRESS: 'info', PROCESSED: 'info', DRAFT: 'neutral', SCHEDULED: 'info', ENROLLED: 'neutral', WAITING: 'neutral', WAITING_ON_EMPLOYEE: 'warning',
  REJECTED: 'danger', CANCELLED: 'neutral', WITHDRAWN: 'neutral', CLOSED: 'neutral', ABSENT: 'danger', OFF_TRACK: 'danger', AT_RISK: 'warning', LATE: 'warning', HALF_DAY: 'warning', ON_LEAVE: 'info', HOLIDAY: 'primary', WEEKEND: 'neutral', NOT_MARKED: 'neutral', UPCOMING: 'neutral', SKIPPED: 'neutral',
  // employees
  PROBATION: 'info', ONBOARDING: 'primary', NOTICE_PERIOD: 'warning', EXITED: 'neutral',
  // recruitment
  APPLIED: 'neutral', SCREENING: 'info', INTERVIEW: 'primary', OFFER: 'warning', ON_HOLD: 'warning',
  // assets / helpdesk
  ASSIGNED: 'primary', IN_REPAIR: 'warning', RETIRED: 'neutral', LOST: 'danger',
  URGENT: 'danger', HIGH: 'warning', MEDIUM: 'info', LOW: 'neutral',
  // reviews
  SELF_REVIEW: 'warning', MANAGER_REVIEW: 'info', CALIBRATION: 'primary', NOT_STARTED: 'neutral',
};

export function StatusBadge({ status, label, className }: { status?: string | null; label?: string; className?: string }) {
  if (!status) return null;
  return (
    <Badge variant={STATUS_VARIANTS[status] ?? 'neutral'} className={className} dot>
      {label ?? humanize(status)}
    </Badge>
  );
}
