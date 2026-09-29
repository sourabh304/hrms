'use client';

import { AlertTriangle, Clock, LifeBuoy, Plus, ShieldCheck, Smile, Timer } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field, Input, Select, Textarea } from '@/components/ui/form-controls';
import { Modal } from '@/components/ui/modal';
import { EmptyState, PageHeader, PersonCell, Skeleton, StatCard } from '@/components/ui/misc';
import { Pagination, Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { Segmented, Tabs } from '@/components/ui/tabs';
import { useAccess } from '@/features/auth/api';
import { PERMISSIONS } from '@/features/auth/types';
import { enumOptions } from '@/lib/options';
import { humanize, timeAgo } from '@/lib/utils';
import { TICKET_CATEGORIES, TICKET_PRIORITIES, useCreateTicket, useHelpdeskStats, useTickets } from '../api';

function NewTicketModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const create = useCreateTicket();
  const [f, setF] = useState({ subject: '', description: '', category: 'GENERAL', priority: 'MEDIUM' });
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Raise a ticket"
      description="HR and IT support teams respond within the SLA for the chosen priority."
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button loading={create.isPending} onClick={async () => {
            if (f.subject.length < 5 || f.description.length < 10) return toast.error('Please add a subject and a short description');
            const t = await create.mutateAsync(f);
            toast.success(`${t.ticketNumber} created`);
            onClose();
            router.push(`/helpdesk/${t.id}`);
          }}>Submit</Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Subject" required className="sm:col-span-2"><Input value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} /></Field>
        <Field label="Category"><Select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} options={enumOptions(TICKET_CATEGORIES)} /></Field>
        <Field label="Priority" hint="Urgent: 4h · High: 24h · Medium: 48h · Low: 72h"><Select value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value })} options={enumOptions(TICKET_PRIORITIES)} /></Field>
        <Field label="Describe the issue" required className="sm:col-span-2"><Textarea rows={5} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
      </div>
    </Modal>
  );
}

function TicketTable({ scope }: { scope: 'me' | 'assigned' | 'all' }) {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const { data, isLoading } = useTickets({ scope, page, status: status || undefined });
  return (
    <Card>
      <div className="border-b border-border p-3">
        <Segmented value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={[{ value: '', label: 'All' }, { value: 'OPEN', label: 'Open' }, { value: 'IN_PROGRESS', label: 'In progress' }, { value: 'WAITING_ON_EMPLOYEE', label: 'Waiting' }, { value: 'RESOLVED', label: 'Resolved' }, { value: 'CLOSED', label: 'Closed' }]} />
      </div>
      <Table>
        <THead><tr><TH>Ticket</TH>{scope !== 'me' && <TH>Raised by</TH>}<TH>Category</TH><TH>Priority</TH><TH>Status</TH><TH>Assignee</TH><TH>Updated</TH></tr></THead>
        <TBody>
          {isLoading && <tr><TD colSpan={7}><Skeleton className="h-24" /></TD></tr>}
          {data?.data.map((t) => (
            <TR key={t.id} className="cursor-pointer" onClick={() => router.push(`/helpdesk/${t.id}`)}>
              <TD>
                <p className="font-medium">{t.subject}</p>
                <p className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
                  {t.ticketNumber}
                  {t.isOverdue && <span className="inline-flex items-center gap-0.5 font-sans font-medium text-danger"><AlertTriangle className="h-3 w-3" />SLA breached</span>}
                </p>
              </TD>
              {scope !== 'me' && <TD><PersonCell name={t.raisedBy.fullName} src={t.raisedBy.avatarUrl} size="xs" /></TD>}
              <TD className="text-muted-foreground">{humanize(t.category)}</TD>
              <TD><StatusBadge status={t.priority} /></TD>
              <TD><StatusBadge status={t.status} /></TD>
              <TD className="text-muted-foreground">{t.assignee?.fullName ?? 'Unassigned'}</TD>
              <TD className="text-muted-foreground">{timeAgo(t.createdAt)}</TD>
            </TR>
          ))}
        </TBody>
      </Table>
      {data && !data.data.length && <EmptyState icon={LifeBuoy} title="No tickets here" />}
      {data && <Pagination page={page} totalPages={data.meta.totalPages} total={data.meta.total} onPage={setPage} />}
    </Card>
  );
}

export function HelpdeskPage() {
  const params = useSearchParams();
  const router = useRouter();
  const { can } = useAccess();
  const isStaff = can(PERMISSIONS.HELPDESK_MANAGE);
  const [tab, setTab] = useState(isStaff ? 'all' : 'mine');
  const [open, setOpen] = useState(params.get('new') === '1');
  const { data: stats } = useHelpdeskStats(isStaff);

  return (
    <>
      <PageHeader title="Helpdesk" description="Ask HR or IT anything — track every request to resolution." actions={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Raise ticket</Button>} />
      {isStaff && stats && (
        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-5">
          <StatCard label="Open tickets" value={stats.open} icon={LifeBuoy} />
          <StatCard label="SLA breached" value={stats.overdue} icon={AlertTriangle} tone="danger" />
          <StatCard label="Unassigned" value={stats.unassigned} icon={Clock} tone="warning" />
          <StatCard label="SLA compliance" value={`${stats.slaCompliance}%`} hint={stats.avgResolutionHours ? `avg ${stats.avgResolutionHours}h to resolve` : undefined} icon={Timer} tone="success" />
          <StatCard label="CSAT" value={stats.csat ? `${stats.csat} / 5` : '—'} icon={Smile} tone="info" />
        </div>
      )}
      <Tabs className="mb-6" value={tab} onChange={setTab} tabs={[
        { value: 'all', label: 'All tickets', hidden: !isStaff },
        { value: 'assigned', label: 'Assigned to me', hidden: !isStaff },
        { value: 'mine', label: 'My tickets' },
      ]} />
      {tab === 'mine' && <TicketTable scope="me" />}
      {tab === 'assigned' && <TicketTable scope="assigned" />}
      {tab === 'all' && <TicketTable scope="all" />}
      {!isStaff && (
        <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground"><ShieldCheck className="h-3.5 w-3.5" /> Tickets are visible only to you and the support team.</p>
      )}
      <NewTicketModal open={open} onClose={() => { setOpen(false); if (params.get('new')) router.replace('/helpdesk'); }} />
    </>
  );
}
