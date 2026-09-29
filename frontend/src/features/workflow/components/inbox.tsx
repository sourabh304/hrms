'use client';

import { CalendarDays, CheckCheck, Clock, FileSignature, Inbox as InboxIcon, LogOut, Paperclip, Wallet, X } from 'lucide-react';
import Link from 'next/link';
import { Fragment, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Textarea } from '@/components/ui/form-controls';
import { Avatar, EmptyState, PageHeader, PersonCell, Skeleton } from '@/components/ui/misc';
import { Pagination, Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { Segmented, Tabs } from '@/components/ui/tabs';
import { useAccess } from '@/features/auth/api';
import { PERMISSIONS } from '@/features/auth/types';
import { fileUrl } from '@/lib/api-client';
import { cn, formatDate, humanize, timeAgo } from '@/lib/utils';
import { useBulkDecide, useDecide, useInbox, useMyRequests } from '../api';
import { WORKFLOW_LABELS, type InboxItem, type WorkflowType } from '../types';
import { ApprovalChain } from './approval-chain';

const TYPE_ICON: Record<WorkflowType, typeof Clock> = {
  LEAVE: CalendarDays,
  EXPENSE: Wallet,
  ATTENDANCE_REGULARIZATION: Clock,
  SEPARATION: LogOut,
  JOB_REQUISITION: FileSignature,
};

function MetaValue({ k, v }: { k: string; v: unknown }) {
  if (k === 'receiptFileId') {
    return v ? (
      <a href={fileUrl(String(v))} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
        <Paperclip className="h-3.5 w-3.5" /> View receipt
      </a>
    ) : (
      <span className="text-muted-foreground">No receipt</span>
    );
  }
  if (typeof v === 'boolean') return <>{v ? 'Yes' : 'No'}</>;
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) return <>{formatDate(v)}</>;
  if (k === 'amount' && typeof v === 'number') return <>{v.toLocaleString('en-US', { minimumFractionDigits: 2 })}</>;
  if (typeof v === 'string' && /^[A-Z_]+$/.test(v)) return <>{humanize(v)}</>;
  return <>{v === null || v === undefined || v === '' ? '—' : String(v)}</>;
}

function InboxDetail({ item, onDone }: { item: InboxItem; onDone: () => void }) {
  const decide = useDecide();
  const [comment, setComment] = useState('');
  const r = item.request;
  const act = async (decision: 'approve' | 'reject') => {
    if (decision === 'reject' && !comment.trim()) {
      toast.error('Please add a comment explaining the rejection');
      return;
    }
    await decide.mutateAsync({ id: r.id, decision, comment: comment || undefined });
    toast.success(decision === 'approve' ? 'Approved' : 'Rejected');
    setComment('');
    onDone();
  };

  return (
    <Card className="sticky top-24">
      <CardHeader title={r.title} description={`${WORKFLOW_LABELS[r.type]} · submitted ${timeAgo(r.createdAt)}`} action={<StatusBadge status={r.status} />} />
      <CardContent className="space-y-5">
        <div className="flex items-center justify-between rounded-lg bg-muted p-3">
          <PersonCell name={r.requester.fullName} src={r.requester.avatarUrl} subtitle={`${r.requester.designation?.title ?? ''} · ${r.requester.department?.name ?? ''}`} />
          <Link href={`/employees/${r.requester.id}`} className="text-xs text-primary hover:underline">
            Profile
          </Link>
        </div>

        {r.summary && <p className="text-sm leading-relaxed text-muted-foreground">“{r.summary}”</p>}

        {r.metadata && (
          <dl className="grid grid-cols-2 gap-3 rounded-lg border border-border p-3">
            {Object.entries(r.metadata).map(([k, v]) => (
              <div key={k} className="min-w-0">
                <dt className="text-xs text-muted-foreground">{humanize(k.replace(/([A-Z])/g, '_$1').toUpperCase())}</dt>
                <dd className="truncate text-sm font-medium">
                  <MetaValue k={k} v={v} />
                </dd>
              </div>
            ))}
          </dl>
        )}

        <div>
          <p className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Approval chain</p>
          <ApprovalChain steps={r.steps} submittedAt={r.createdAt} />
        </div>

        <div className="space-y-3 border-t border-border pt-4">
          <p className="text-xs text-muted-foreground">
            You are acting as: <span className="font-medium text-foreground">{item.step.label}</span>
          </p>
          <Textarea placeholder="Add a comment (required for rejection)" value={comment} onChange={(e) => setComment(e.target.value)} rows={2} />
          <div className="flex gap-2">
            <Button variant="success" className="flex-1" loading={decide.isPending && decide.variables?.decision === 'approve'} onClick={() => act('approve')}>
              <CheckCheck className="h-4 w-4" /> Approve
            </Button>
            <Button variant="outline" className="flex-1 text-danger" loading={decide.isPending && decide.variables?.decision === 'reject'} onClick={() => act('reject')}>
              <X className="h-4 w-4" /> Reject
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PendingInbox() {
  const [type, setType] = useState<string>('all');
  const { data = [], isLoading } = useInbox();
  const bulk = useBulkDecide();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);

  const items = useMemo(() => data.filter((i) => type === 'all' || i.request.type === type), [data, type]);
  const active = items.find((i) => i.request.id === activeId) ?? items[0];
  const counts = data.reduce<Record<string, number>>((m, i) => ({ ...m, [i.request.type]: (m[i.request.type] ?? 0) + 1 }), {});

  const bulkAct = async (decision: 'APPROVED' | 'REJECTED') => {
    const results = await bulk.mutateAsync({ requestIds: [...selected], decision, comment: decision === 'REJECTED' ? 'Rejected in bulk' : undefined });
    const ok = results.filter((r) => r.ok).length;
    toast.success(`${ok} request(s) ${decision.toLowerCase()}`);
    if (ok < results.length) toast.error(`${results.length - ok} could not be processed`);
    setSelected(new Set());
  };

  if (isLoading) return <Skeleton className="h-96" />;
  if (!data.length) return <Card><EmptyState icon={InboxIcon} title="Inbox zero 🎉" description="There is nothing waiting for your approval right now." /></Card>;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
      <Card className="self-start">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-3">
          <Segmented
            value={type}
            onChange={setType}
            options={[{ value: 'all', label: `All (${data.length})` }, ...Object.entries(counts).map(([t, n]) => ({ value: t, label: `${WORKFLOW_LABELS[t as WorkflowType]} (${n})` }))]}
          />
          {selected.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{selected.size} selected</span>
              <Button size="sm" variant="success" loading={bulk.isPending} onClick={() => bulkAct('APPROVED')}>
                Approve all
              </Button>
              <Button size="sm" variant="outline" onClick={() => bulkAct('REJECTED')}>
                Reject
              </Button>
            </div>
          )}
        </div>
        <ul className="divide-y divide-border">
          {items.map((item) => {
            const r = item.request;
            const Icon = TYPE_ICON[r.type];
            const isActive = active?.request.id === r.id;
            return (
              <li key={r.id} className={cn('flex items-start gap-3 px-4 py-3.5 transition-colors', isActive ? 'bg-primary-soft/50' : 'hover:bg-muted/50')}>
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 cursor-pointer accent-primary"
                  checked={selected.has(r.id)}
                  onChange={(e) =>
                    setSelected((s) => {
                      const n = new Set(s);
                      if (e.target.checked) n.add(r.id);
                      else n.delete(r.id);
                      return n;
                    })
                  }
                  aria-label={`Select ${r.title}`}
                />
                <button className="flex min-w-0 flex-1 cursor-pointer items-start gap-3 text-left" onClick={() => setActiveId(r.id)}>
                  <Avatar name={r.requester.fullName} src={r.requester.avatarUrl} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium">{r.requester.fullName}</p>
                      <span className="shrink-0 text-[11px] text-muted-foreground">{timeAgo(r.createdAt)}</span>
                    </div>
                    <p className="truncate text-sm text-muted-foreground">{r.title}</p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <Badge variant="primary">
                        <Icon className="h-3 w-3" /> {WORKFLOW_LABELS[r.type]}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground">
                        Step {item.step.stepOrder + 1} of {r.steps.length} · {item.step.label}
                      </span>
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </Card>
      {active && <InboxDetail key={active.request.id} item={active} onDone={() => setActiveId(null)} />}
    </div>
  );
}

function RequestsTable({ scope }: { scope: 'mine' | 'all' }) {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const { data, isLoading } = useMyRequests({ page, status: status || undefined, scope });
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <Card>
      <div className="border-b border-border p-3">
        <Segmented value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={[{ value: '', label: 'All' }, { value: 'PENDING', label: 'Pending' }, { value: 'APPROVED', label: 'Approved' }, { value: 'REJECTED', label: 'Rejected' }]} />
      </div>
      <Table>
        <THead>
          <tr>
            <TH>Request</TH>
            {scope === 'all' && <TH>Requester</TH>}
            <TH>Type</TH>
            <TH>Progress</TH>
            <TH>Status</TH>
            <TH>Submitted</TH>
          </tr>
        </THead>
        <TBody>
          {isLoading && <tr><TD colSpan={6}><Skeleton className="h-24" /></TD></tr>}
          {data?.data.map((r) => (
            <Fragment key={r.id}>
              <TR className="cursor-pointer" onClick={() => setOpenId(openId === r.id ? null : r.id)}>
                <TD className="font-medium">{r.title}</TD>
                {scope === 'all' && <TD>{r.requester.fullName}</TD>}
                <TD><Badge variant="primary">{WORKFLOW_LABELS[r.type]}</Badge></TD>
                <TD>
                  <div className="flex gap-1">
                    {r.steps.map((s) => (
                      <span key={s.id} title={`${s.label}: ${humanize(s.status)}`} className={cn('h-1.5 w-6 rounded-full', { APPROVED: 'bg-success', REJECTED: 'bg-danger', PENDING: 'bg-warning', WAITING: 'bg-muted-foreground/30', SKIPPED: 'bg-muted-foreground/20' }[s.status])} />
                    ))}
                    {!r.steps.length && <span className="text-xs text-muted-foreground">Auto</span>}
                  </div>
                </TD>
                <TD><StatusBadge status={r.status} /></TD>
                <TD className="text-muted-foreground">{formatDate(r.createdAt)}</TD>
              </TR>
              {openId === r.id && (
                <tr>
                  <TD colSpan={6} className="bg-muted/30">
                    <div className="max-w-lg py-2">
                      <ApprovalChain steps={r.steps} submittedAt={r.createdAt} />
                    </div>
                  </TD>
                </tr>
              )}
            </Fragment>
          ))}
        </TBody>
      </Table>
      {data && !data.data.length && <EmptyState title="No requests found" />}
      {data && <Pagination page={data.meta.page} totalPages={data.meta.totalPages} total={data.meta.total} onPage={setPage} />}
    </Card>
  );
}

export function InboxPage() {
  const { can } = useAccess();
  const [tab, setTab] = useState('pending');
  return (
    <>
      <PageHeader title="Inbox" description="Everything that needs your decision, in one place." />
      <Tabs
        className="mb-6"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'pending', label: 'Awaiting my action' },
          { value: 'mine', label: 'My requests' },
          { value: 'all', label: 'All requests', hidden: !can(PERMISSIONS.WORKFLOW_MANAGE) },
        ]}
      />
      {tab === 'pending' && <PendingInbox />}
      {tab === 'mine' && <RequestsTable scope="mine" />}
      {tab === 'all' && <RequestsTable scope="all" />}
    </>
  );
}
