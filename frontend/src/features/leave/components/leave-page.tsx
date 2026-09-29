'use client';

import { CalendarPlus, CalendarX2, Pencil, Plus, RefreshCcw } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { Checkbox, Field, Input, Textarea } from '@/components/ui/form-controls';
import { ConfirmDialog, Modal } from '@/components/ui/modal';
import { EmptyState, PageHeader, PersonCell, Skeleton } from '@/components/ui/misc';
import { Pagination, Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { Segmented, Tabs } from '@/components/ui/tabs';
import { useAccess } from '@/features/auth/api';
import { PERMISSIONS } from '@/features/auth/types';
import { formatDate, todayISO } from '@/lib/utils';
import { useAllocateYear, useCancelLeave, useLeaveRequests, useLeaveTypes, useSaveLeaveType, type LeaveRequest, type LeaveType } from '../api';
import { ApplyLeaveModal } from './apply-leave-modal';
import { BalanceCards } from './balance-cards';
import { TeamCalendar } from './team-calendar';

function RequestsTable({ scope }: { scope: 'me' | 'team' | 'all' }) {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const { data, isLoading } = useLeaveRequests({ scope, page, status: status || undefined, search: search || undefined });
  const cancel = useCancelLeave();
  const [toCancel, setToCancel] = useState<LeaveRequest | null>(null);

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-3 border-b border-border p-3">
        <Segmented
          value={status}
          onChange={(v) => { setStatus(v); setPage(1); }}
          options={[{ value: '', label: 'All' }, { value: 'PENDING', label: 'Pending' }, { value: 'APPROVED', label: 'Approved' }, { value: 'REJECTED', label: 'Rejected' }, { value: 'CANCELLED', label: 'Cancelled' }]}
        />
        {scope !== 'me' && <Input className="w-56" placeholder="Search employee" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />}
        {scope === 'team' && (
          <Link href="/inbox" className="ml-auto text-xs text-primary hover:underline">Approve pending requests in your Inbox →</Link>
        )}
      </div>
      <Table>
        <THead>
          <tr>
            {scope !== 'me' && <TH>Employee</TH>}
            <TH>Type</TH>
            <TH>Dates</TH>
            <TH>Days</TH>
            <TH>Reason</TH>
            <TH>Status</TH>
            <TH />
          </tr>
        </THead>
        <TBody>
          {isLoading && <tr><TD colSpan={7}><Skeleton className="h-24" /></TD></tr>}
          {data?.data.map((r) => {
            const cancellable = scope === 'me' && (r.status === 'PENDING' || (r.status === 'APPROVED' && r.startDate > todayISO()));
            return (
              <TR key={r.id}>
                {scope !== 'me' && <TD><PersonCell name={r.employee.fullName} src={r.employee.avatarUrl} subtitle={r.employee.designation?.title} /></TD>}
                <TD>
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: r.leaveType.color }} />
                    {r.leaveType.name}
                  </span>
                </TD>
                <TD className="whitespace-nowrap">
                  {formatDate(r.startDate)}
                  {r.endDate !== r.startDate && ` – ${formatDate(r.endDate)}`}
                  {r.isHalfDay && <span className="ml-1 text-xs text-muted-foreground">({r.halfDaySession === 'FIRST' ? 'AM' : 'PM'})</span>}
                </TD>
                <TD className="tabular">{r.days}</TD>
                <TD className="max-w-xs truncate text-muted-foreground" title={r.reason}>{r.reason}</TD>
                <TD>
                  <StatusBadge status={r.status} />
                  {r.decisionNote && <p className="mt-1 max-w-48 truncate text-[11px] text-muted-foreground" title={r.decisionNote}>“{r.decisionNote}”</p>}
                </TD>
                <TD className="text-right">
                  {cancellable && <Button size="sm" variant="ghost" onClick={() => setToCancel(r)}>Cancel</Button>}
                </TD>
              </TR>
            );
          })}
        </TBody>
      </Table>
      {data && !data.data.length && <EmptyState icon={CalendarX2} title="No leave requests" />}
      {data && <Pagination page={page} totalPages={data.meta.totalPages} total={data.meta.total} onPage={setPage} />}
      <ConfirmDialog
        open={!!toCancel}
        onClose={() => setToCancel(null)}
        title="Cancel leave request?"
        message={toCancel ? `${toCancel.leaveType.name} · ${formatDate(toCancel.startDate)} – ${formatDate(toCancel.endDate)}. The days will be returned to your balance.` : ''}
        confirmLabel="Cancel request"
        variant="danger"
        loading={cancel.isPending}
        onConfirm={async () => {
          await cancel.mutateAsync(toCancel!.id);
          toast.success('Leave cancelled');
          setToCancel(null);
        }}
      />
    </Card>
  );
}

function LeaveTypesAdmin() {
  const { data = [] } = useLeaveTypes(true);
  const save = useSaveLeaveType();
  const allocate = useAllocateYear();
  const [editing, setEditing] = useState<Partial<LeaveType> | null>(null);
  const nextYear = new Date().getFullYear() + 1;

  return (
    <Card>
      <CardHeader
        title="Leave policies"
        description="Entitlements, carry-forward and rules per leave type."
        action={
          <>
            <Button size="sm" variant="outline" loading={allocate.isPending} onClick={async () => {
              const r = await allocate.mutateAsync(nextYear);
              toast.success(`${r.balancesCreated} balances allocated for ${r.year} (with carry-forward)`);
            }}>
              <RefreshCcw className="h-4 w-4" /> Allocate {nextYear}
            </Button>
            <Button size="sm" onClick={() => setEditing({ color: '#6366f1', annualQuota: 10, isPaid: true, allowHalfDay: true })}>
              <Plus className="h-4 w-4" /> New type
            </Button>
          </>
        }
      />
      <Table>
        <THead><tr><TH>Leave type</TH><TH>Code</TH><TH>Annual quota</TH><TH>Paid</TH><TH>Carry forward</TH><TH>Half day</TH><TH>Status</TH><TH /></tr></THead>
        <TBody>
          {data.map((t) => (
            <TR key={t.id}>
              <TD>
                <span className="flex items-center gap-2 font-medium"><span className="h-2.5 w-2.5 rounded-full" style={{ background: t.color }} />{t.name}</span>
                {t.description && <p className="mt-0.5 max-w-xs truncate text-xs text-muted-foreground">{t.description}</p>}
              </TD>
              <TD className="font-mono text-xs">{t.code}</TD>
              <TD className="tabular">{t.isPaid ? `${t.annualQuota} days` : '—'}</TD>
              <TD>{t.isPaid ? 'Yes' : 'No'}</TD>
              <TD>{t.carryForward ? `Up to ${t.maxCarryForward}` : 'No'}</TD>
              <TD>{t.allowHalfDay ? 'Yes' : 'No'}</TD>
              <TD><StatusBadge status={t.isActive ? 'ACTIVE' : 'CLOSED'} label={t.isActive ? 'Active' : 'Inactive'} /></TD>
              <TD className="text-right"><Button size="icon-sm" variant="ghost" onClick={() => setEditing(t)} aria-label={`Edit ${t.name}`}><Pencil className="h-3.5 w-3.5" /></Button></TD>
            </TR>
          ))}
        </TBody>
      </Table>
      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.id ? `Edit ${editing.name}` : 'New leave type'}
        footer={
          <>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button loading={save.isPending} onClick={async () => {
              const e = editing!;
              await save.mutateAsync({ id: e.id, name: e.name, code: e.code, description: e.description ?? undefined, color: e.color, annualQuota: Number(e.annualQuota), isPaid: e.isPaid, carryForward: e.carryForward, maxCarryForward: Number(e.maxCarryForward ?? 0), allowHalfDay: e.allowHalfDay, ...(e.id ? { isActive: e.isActive } : {}) });
              toast.success('Leave type saved');
              setEditing(null);
            }}>Save</Button>
          </>
        }
      >
        {editing && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" required><Input value={editing.name ?? ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></Field>
            <Field label="Code" required><Input value={editing.code ?? ''} onChange={(e) => setEditing({ ...editing, code: e.target.value })} /></Field>
            <Field label="Annual quota (days)"><Input type="number" min={0} value={editing.annualQuota ?? 0} onChange={(e) => setEditing({ ...editing, annualQuota: Number(e.target.value) })} /></Field>
            <Field label="Color"><Input type="color" className="h-9 p-1" value={editing.color} onChange={(e) => setEditing({ ...editing, color: e.target.value })} /></Field>
            <Field label="Description" className="sm:col-span-2"><Textarea rows={2} value={editing.description ?? ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></Field>
            <Checkbox label="Paid leave" checked={!!editing.isPaid} onChange={(e) => setEditing({ ...editing, isPaid: e.target.checked })} />
            <Checkbox label="Allow half days" checked={!!editing.allowHalfDay} onChange={(e) => setEditing({ ...editing, allowHalfDay: e.target.checked })} />
            <Checkbox label="Carry forward unused days" checked={!!editing.carryForward} onChange={(e) => setEditing({ ...editing, carryForward: e.target.checked })} />
            {editing.carryForward && <Field label="Max carry forward"><Input type="number" min={0} value={editing.maxCarryForward ?? 0} onChange={(e) => setEditing({ ...editing, maxCarryForward: Number(e.target.value) })} /></Field>}
            {editing.id && <Checkbox label="Active" checked={!!editing.isActive} onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })} />}
          </div>
        )}
      </Modal>
    </Card>
  );
}

export function LeavePage() {
  const { can, isManager } = useAccess();
  const isAdmin = can(PERMISSIONS.LEAVE_MANAGE);
  const [tab, setTab] = useState('mine');
  const [applyOpen, setApplyOpen] = useState(false);

  return (
    <>
      <PageHeader
        title="Leave"
        description="Balances, requests and your team's availability."
        actions={<Button onClick={() => setApplyOpen(true)}><CalendarPlus className="h-4 w-4" /> Request time off</Button>}
      />
      <div className="mb-6">
        <BalanceCards />
      </div>
      <Tabs
        className="mb-6"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'mine', label: 'My requests' },
          { value: 'calendar', label: "Who's out" },
          { value: 'team', label: 'Team requests', hidden: !isManager },
          { value: 'all', label: 'All requests', hidden: !isAdmin },
          { value: 'org-calendar', label: 'Org calendar', hidden: !isAdmin },
          { value: 'policies', label: 'Policies', hidden: !isAdmin },
        ]}
      />
      {tab === 'mine' && <RequestsTable scope="me" />}
      {tab === 'calendar' && <TeamCalendar />}
      {tab === 'team' && <RequestsTable scope="team" />}
      {tab === 'all' && <RequestsTable scope="all" />}
      {tab === 'org-calendar' && <TeamCalendar scope="all" />}
      {tab === 'policies' && <LeaveTypesAdmin />}
      <ApplyLeaveModal open={applyOpen} onClose={() => setApplyOpen(false)} />
    </>
  );
}
