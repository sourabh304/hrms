'use client';

import { ArrowLeft, Lock, Send, Star } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Checkbox, Field, Select, Textarea } from '@/components/ui/form-controls';
import { Avatar, KeyValue, PageLoader, PersonCell } from '@/components/ui/misc';
import { useAccess } from '@/features/auth/api';
import { PERMISSIONS } from '@/features/auth/types';
import { EmployeePicker } from '@/features/employees/components/employee-picker';
import { enumOptions } from '@/lib/options';
import { cn, formatDateTime, humanize, timeAgo } from '@/lib/utils';
import { TICKET_PRIORITIES, TICKET_STATUSES, useComment, useRateTicket, useTicket, useUpdateTicket } from '../api';

export function TicketDetail({ id }: { id: string }) {
  const { data: t, isLoading } = useTicket(id);
  const { can, employeeId } = useAccess();
  const isStaff = can(PERMISSIONS.HELPDESK_MANAGE);
  const update = useUpdateTicket(id);
  const comment = useComment(id);
  const rate = useRateTicket(id);
  const [message, setMessage] = useState('');
  const [internal, setInternal] = useState(false);

  if (isLoading || !t) return <PageLoader />;
  const isRequester = t.raisedById === employeeId;
  const resolved = t.status === 'RESOLVED' || t.status === 'CLOSED';

  return (
    <>
      <Link href="/helpdesk" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Helpdesk</Link>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold">{t.subject}</h1>
        <StatusBadge status={t.status} />
        <StatusBadge status={t.priority} />
        <span className="font-mono text-xs text-muted-foreground">{t.ticketNumber}</span>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardContent className="space-y-5">
            <div className="flex gap-3">
              <Avatar name={t.raisedBy.fullName} src={t.raisedBy.avatarUrl} size="sm" />
              <div className="flex-1 rounded-xl bg-muted px-4 py-3">
                <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">{t.raisedBy.fullName}</span> · {timeAgo(t.createdAt)}</p>
                <p className="mt-1.5 text-sm whitespace-pre-line">{t.description}</p>
              </div>
            </div>
            {t.comments?.map((c) => (
              <div key={c.id} className="flex gap-3">
                <Avatar name={c.author.fullName} src={c.author.avatarUrl} size="sm" />
                <div className={cn('flex-1 rounded-xl px-4 py-3', c.isInternal ? 'border border-dashed border-warning/50 bg-warning-soft/50' : c.author.id === t.raisedById ? 'bg-muted' : 'bg-primary-soft/60')}>
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{c.author.fullName}</span> · {timeAgo(c.createdAt)}
                    {c.isInternal && <span className="inline-flex items-center gap-0.5 text-warning"><Lock className="h-3 w-3" /> Internal note</span>}
                  </p>
                  <p className="mt-1.5 text-sm whitespace-pre-line">{c.message}</p>
                </div>
              </div>
            ))}

            {t.status !== 'CLOSED' && (
              <div className="border-t border-border pt-5">
                <Textarea rows={3} placeholder={isRequester ? 'Reply to the support team…' : 'Reply to the employee…'} value={message} onChange={(e) => setMessage(e.target.value)} />
                <div className="mt-3 flex items-center justify-between">
                  {isStaff ? <Checkbox label="Internal note (hidden from employee)" checked={internal} onChange={(e) => setInternal(e.target.checked)} /> : <span />}
                  <Button loading={comment.isPending} disabled={!message.trim()} onClick={async () => {
                    await comment.mutateAsync({ message, isInternal: internal });
                    setMessage('');
                    setInternal(false);
                  }}><Send className="h-4 w-4" /> Send</Button>
                </div>
              </div>
            )}

            {isRequester && resolved && !t.satisfaction && (
              <div className="rounded-xl border border-border p-4 text-center">
                <p className="text-sm font-medium">How satisfied are you with the resolution?</p>
                <div className="mt-3 flex justify-center gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} className="cursor-pointer p-1 text-muted-foreground hover:text-warning" aria-label={`${n} stars`} onClick={async () => { await rate.mutateAsync(n); toast.success('Thanks for your feedback!'); }}>
                      <Star className="h-6 w-6" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Details" />
            <CardContent className="space-y-4">
              <PersonCell name={t.raisedBy.fullName} src={t.raisedBy.avatarUrl} subtitle={`${t.raisedBy.designation?.title ?? ''} · ${t.raisedBy.department?.name ?? ''}`} />
              <dl className="grid grid-cols-2 gap-4">
                <KeyValue label="Category" value={humanize(t.category)} />
                <KeyValue label="Created" value={formatDateTime(t.createdAt)} />
                <KeyValue label="SLA due" value={<span className={cn(t.isOverdue && 'text-danger')}>{formatDateTime(t.slaDueAt)}</span>} />
                <KeyValue label="Resolved" value={t.resolvedAt ? formatDateTime(t.resolvedAt) : '—'} />
                {t.satisfaction && <KeyValue label="Satisfaction" value={`${t.satisfaction} / 5`} />}
              </dl>
            </CardContent>
          </Card>
          {isStaff && (
            <Card>
              <CardHeader title="Manage" />
              <CardContent className="space-y-4">
                <Field label="Status"><Select value={t.status} options={enumOptions(TICKET_STATUSES)} onChange={async (e) => { await update.mutateAsync({ status: e.target.value }); toast.success('Status updated'); }} /></Field>
                <Field label="Priority"><Select value={t.priority} options={enumOptions(TICKET_PRIORITIES)} onChange={async (e) => { await update.mutateAsync({ priority: e.target.value }); toast.success('Priority updated — SLA recalculated'); }} /></Field>
                <Field label="Assignee">
                  <EmployeePicker value={t.assigneeId} initialLabel={t.assignee?.fullName} onChange={async (e) => { await update.mutateAsync({ assigneeId: e?.id ?? null }); toast.success(e ? `Assigned to ${e.fullName}` : 'Unassigned'); }} />
                </Field>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
