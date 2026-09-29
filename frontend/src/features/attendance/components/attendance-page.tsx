'use client';

import { addMonths, format, parseISO } from 'date-fns';
import { CalendarCheck, ChevronLeft, ChevronRight, Clock, FilePen, Plus, TimerReset, UserX } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { Checkbox, Field, Input, Select, Textarea } from '@/components/ui/form-controls';
import { Modal } from '@/components/ui/modal';
import { EmptyState, PageHeader, PersonCell, Skeleton, StatCard } from '@/components/ui/misc';
import { Pagination, Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { Segmented, Tabs } from '@/components/ui/tabs';
import { useAccess } from '@/features/auth/api';
import { PERMISSIONS } from '@/features/auth/types';
import { useDepartments } from '@/features/organization/api';
import { cn, formatDate, formatTime, humanize, minutesToHours, todayISO } from '@/lib/utils';
import { useMonth, useRegularizations, useRegularize, useRoster, useSaveShift, useShifts, type DayStatus, type Shift } from '../api';
import { ClockCard } from './clock-card';

const DAY_STYLE: Record<DayStatus, string> = {
  PRESENT: 'bg-success-soft text-success',
  LATE: 'bg-warning-soft text-warning',
  HALF_DAY: 'bg-warning-soft text-warning',
  ABSENT: 'bg-danger-soft text-danger',
  ON_LEAVE: 'bg-info-soft text-info',
  HOLIDAY: 'bg-primary-soft text-primary-soft-foreground',
  WEEKEND: 'bg-muted/60 text-muted-foreground',
  NOT_MARKED: 'bg-muted text-muted-foreground',
  UPCOMING: 'text-muted-foreground/60',
};

function MonthCalendar({ employeeId }: { employeeId?: string }) {
  const [month, setMonth] = useState(() => format(new Date(), 'yyyy-MM'));
  const { data, isLoading } = useMonth(month, employeeId);
  const first = parseISO(`${month}-01`);
  const lead = first.getDay();

  return (
    <div className="space-y-6">
      {data && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          <StatCard label="Present days" value={data.summary.present} hint={`of ${data.summary.workingDays} working days`} icon={CalendarCheck} tone="success" />
          <StatCard label="Late arrivals" value={data.summary.late} icon={Clock} tone="warning" />
          <StatCard label="Absent" value={data.summary.absent} icon={UserX} tone="danger" />
          <StatCard label="On leave" value={data.summary.onLeave} tone="info" />
          <StatCard label="Avg. hours / day" value={`${data.summary.avgHours}h`} hint={`${data.summary.totalHours}h total`} icon={TimerReset} />
        </div>
      )}
      <Card>
        <CardHeader
          title={format(first, 'MMMM yyyy')}
          action={
            <div className="flex gap-1">
              <Button variant="outline" size="icon-sm" onClick={() => setMonth(format(addMonths(first, -1), 'yyyy-MM'))} aria-label="Previous month">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setMonth(format(new Date(), 'yyyy-MM'))}>
                Today
              </Button>
              <Button variant="outline" size="icon-sm" onClick={() => setMonth(format(addMonths(first, 1), 'yyyy-MM'))} aria-label="Next month">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          }
        />
        <div className="p-4">
          <div className="mb-2 grid grid-cols-7 gap-1.5 text-center text-[11px] font-medium text-muted-foreground">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>
          {isLoading ? (
            <Skeleton className="h-80" />
          ) : (
            <div className="grid grid-cols-7 gap-1.5">
              {Array.from({ length: lead }).map((_, i) => (
                <div key={`lead-${i}`} />
              ))}
              {data?.days.map((d) => (
                <div
                  key={d.date}
                  title={`${formatDate(d.date)} · ${humanize(d.status)}${d.holiday ? ` · ${d.holiday}` : ''}${d.leaveType ? ` · ${d.leaveType}` : ''}`}
                  className={cn('flex min-h-20 flex-col rounded-lg border border-border p-2 text-left', d.date === todayISO() && 'ring-2 ring-primary')}
                >
                  <span className="text-xs font-semibold">{Number(d.date.slice(8))}</span>
                  {d.status !== 'UPCOMING' && (
                    <span className={cn('mt-1 truncate rounded px-1.5 py-0.5 text-[10px] font-medium', DAY_STYLE[d.status])}>
                      {d.holiday ?? d.leaveType ?? humanize(d.status)}
                    </span>
                  )}
                  {d.record?.checkIn && (
                    <span className="tabular mt-auto hidden text-[10px] text-muted-foreground sm:block">
                      {formatTime(d.record.checkIn)}–{d.record.checkOut ? formatTime(d.record.checkOut) : '…'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

function RosterView({ scope }: { scope: 'team' | 'all' }) {
  const [date, setDate] = useState(todayISO());
  const [departmentId, setDepartmentId] = useState('');
  const { data: departments = [] } = useDepartments();
  const { data, isLoading } = useRoster(date, scope, departmentId || undefined);
  const [filter, setFilter] = useState('ALL');
  const rows = data?.rows.filter((r) => filter === 'ALL' || r.status === filter || (filter === 'PRESENT' && r.status === 'LATE')) ?? [];

  return (
    <div className="space-y-6">
      {data && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          <StatCard label="Headcount" value={data.summary.total} />
          <StatCard label="Present" value={data.summary.present} tone="success" />
          <StatCard label="Late" value={data.summary.late} tone="warning" />
          <StatCard label="On leave" value={data.summary.onLeave} tone="info" />
          <StatCard label="Absent / not marked" value={data.summary.absent + data.summary.notMarked} tone="danger" />
        </div>
      )}
      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-border p-3">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-44" />
          {scope === 'all' && (
            <Select className="w-52" placeholder="All departments" options={departments.map((d) => ({ value: d.id, label: d.name }))} value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} />
          )}
          <Segmented
            value={filter}
            onChange={setFilter}
            options={[{ value: 'ALL', label: 'All' }, { value: 'PRESENT', label: 'Present' }, { value: 'ON_LEAVE', label: 'On leave' }, { value: 'ABSENT', label: 'Absent' }, { value: 'NOT_MARKED', label: 'Not marked' }]}
          />
        </div>
        <Table>
          <THead>
            <tr>
              <TH>Employee</TH>
              <TH>Department</TH>
              <TH>Status</TH>
              <TH>Check in</TH>
              <TH>Check out</TH>
              <TH>Hours</TH>
              <TH>Source</TH>
            </tr>
          </THead>
          <TBody>
            {isLoading && <tr><TD colSpan={7}><Skeleton className="h-32" /></TD></tr>}
            {rows.map((r) => (
              <TR key={r.employee.id}>
                <TD><PersonCell name={r.employee.fullName} src={r.employee.avatarUrl} subtitle={r.employee.designation} /></TD>
                <TD className="text-muted-foreground">{r.employee.department}</TD>
                <TD><StatusBadge status={r.status} label={r.leaveType ?? undefined} /></TD>
                <TD className="tabular">{formatTime(r.record?.checkIn)}</TD>
                <TD className="tabular">{formatTime(r.record?.checkOut)}</TD>
                <TD className="tabular">{r.record?.workMinutes ? minutesToHours(r.record.workMinutes) : '—'}</TD>
                <TD className="text-xs text-muted-foreground">{r.record ? humanize(r.record.source) : '—'}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
        {data && !rows.length && <EmptyState title="No one matches this filter" />}
      </Card>
    </div>
  );
}

function RegularizeModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const regularize = useRegularize();
  const [form, setForm] = useState({ date: todayISO(), checkIn: '09:00', checkOut: '18:00', reason: '' });
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Regularize attendance"
      description="Correct a missed or wrong punch. Your manager will review the request."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            loading={regularize.isPending}
            onClick={async () => {
              await regularize.mutateAsync(form);
              toast.success('Regularization submitted for approval');
              onClose();
            }}
          >
            Submit request
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Date" required>
          <Input type="date" max={todayISO()} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        </Field>
        <Field label="Check in" required>
          <Input type="time" value={form.checkIn} onChange={(e) => setForm({ ...form, checkIn: e.target.value })} />
        </Field>
        <Field label="Check out" required>
          <Input type="time" value={form.checkOut} onChange={(e) => setForm({ ...form, checkOut: e.target.value })} />
        </Field>
        <Field label="Reason" required className="sm:col-span-3">
          <Textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="e.g. Forgot to clock out after a client call" />
        </Field>
      </div>
    </Modal>
  );
}

function RegularizationList({ scope }: { scope: 'me' | 'team' | 'all' }) {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useRegularizations(scope, page);
  return (
    <Card>
      <Table>
        <THead>
          <tr>
            {scope !== 'me' && <TH>Employee</TH>}
            <TH>Date</TH>
            <TH>Requested time</TH>
            <TH>Reason</TH>
            <TH>Status</TH>
            <TH>Submitted</TH>
          </tr>
        </THead>
        <TBody>
          {isLoading && <tr><TD colSpan={6}><Skeleton className="h-20" /></TD></tr>}
          {data?.data.map((r) => (
            <TR key={r.id}>
              {scope !== 'me' && <TD><PersonCell name={r.employee.fullName} src={r.employee.avatarUrl} /></TD>}
              <TD>{formatDate(r.date)}</TD>
              <TD className="tabular">{r.checkIn} – {r.checkOut}</TD>
              <TD className="max-w-sm truncate text-muted-foreground">{r.reason}</TD>
              <TD><StatusBadge status={r.status} /></TD>
              <TD className="text-muted-foreground">{formatDate(r.createdAt)}</TD>
            </TR>
          ))}
        </TBody>
      </Table>
      {data && !data.data.length && <EmptyState icon={FilePen} title="No regularization requests" />}
      {data && <Pagination page={page} totalPages={data.meta.totalPages} total={data.meta.total} onPage={setPage} />}
    </Card>
  );
}

function ShiftsAdmin() {
  const { data = [] } = useShifts();
  const save = useSaveShift();
  const [editing, setEditing] = useState<Partial<Shift> | null>(null);
  return (
    <Card>
      <CardHeader title="Shifts" description="Working hours, grace period and breaks used for lateness and half-day rules." action={<Button size="sm" onClick={() => setEditing({ startTime: '09:00', endTime: '18:00', graceMinutes: 15, breakMinutes: 60 })}><Plus className="h-4 w-4" />New shift</Button>} />
      <Table>
        <THead><tr><TH>Name</TH><TH>Code</TH><TH>Hours</TH><TH>Grace</TH><TH>Break</TH><TH /></tr></THead>
        <TBody>
          {data.map((s) => (
            <TR key={s.id}>
              <TD className="font-medium">{s.name} {s.isDefault && <StatusBadge status="ACTIVE" label="Default" className="ml-2" />}</TD>
              <TD className="font-mono text-xs">{s.code}</TD>
              <TD className="tabular">{s.startTime} – {s.endTime}</TD>
              <TD>{s.graceMinutes} min</TD>
              <TD>{s.breakMinutes} min</TD>
              <TD className="text-right"><Button size="sm" variant="ghost" onClick={() => setEditing(s)}>Edit</Button></TD>
            </TR>
          ))}
        </TBody>
      </Table>
      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.id ? 'Edit shift' : 'New shift'}
        footer={
          <>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button loading={save.isPending} onClick={async () => {
              const { id, name, code, startTime, endTime, graceMinutes, breakMinutes, isDefault } = editing!;
              await save.mutateAsync({ id, name, code, startTime, endTime, graceMinutes: Number(graceMinutes), breakMinutes: Number(breakMinutes), isDefault });
              toast.success('Shift saved');
              setEditing(null);
            }}>Save</Button>
          </>
        }
      >
        {editing && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" required><Input value={editing.name ?? ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></Field>
            <Field label="Code" required><Input value={editing.code ?? ''} onChange={(e) => setEditing({ ...editing, code: e.target.value })} /></Field>
            <Field label="Start"><Input type="time" value={editing.startTime} onChange={(e) => setEditing({ ...editing, startTime: e.target.value })} /></Field>
            <Field label="End"><Input type="time" value={editing.endTime} onChange={(e) => setEditing({ ...editing, endTime: e.target.value })} /></Field>
            <Field label="Grace (minutes)"><Input type="number" value={editing.graceMinutes} onChange={(e) => setEditing({ ...editing, graceMinutes: Number(e.target.value) })} /></Field>
            <Field label="Break (minutes)"><Input type="number" value={editing.breakMinutes} onChange={(e) => setEditing({ ...editing, breakMinutes: Number(e.target.value) })} /></Field>
            <Checkbox label="Default shift" checked={!!editing.isDefault} onChange={(e) => setEditing({ ...editing, isDefault: e.target.checked })} />
          </div>
        )}
      </Modal>
    </Card>
  );
}

export function AttendancePage() {
  const { can, isManager } = useAccess();
  const isAdmin = can(PERMISSIONS.ATTENDANCE_MANAGE);
  const [tab, setTab] = useState('me');
  const [regOpen, setRegOpen] = useState(false);

  return (
    <>
      <PageHeader
        title="Attendance"
        description="Clock in and out, review your timesheet and correct missed punches."
        actions={<Button variant="outline" onClick={() => setRegOpen(true)}><FilePen className="h-4 w-4" /> Regularize</Button>}
      />
      <div className="mb-6 grid gap-6 lg:grid-cols-[380px_1fr]">
        <ClockCard />
        <Card className="p-5">
          <p className="text-sm font-semibold">How attendance works</p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>• Arrivals after your shift start plus the grace period are marked <strong className="text-warning">late</strong>.</li>
            <li>• Working less than half your shift hours counts as a <strong className="text-warning">half day</strong>.</li>
            <li>• Approved leave and public holidays for your location are applied automatically.</li>
            <li>• Missed a punch? Submit a regularization — it routes to your manager for approval.</li>
          </ul>
        </Card>
      </div>
      <Tabs
        className="mb-6"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'me', label: 'My timesheet' },
          { value: 'team', label: 'My team', hidden: !isManager },
          { value: 'all', label: 'Organization', hidden: !isAdmin },
          { value: 'requests', label: 'Regularizations' },
          { value: 'team-requests', label: 'Team requests', hidden: !isManager },
          { value: 'shifts', label: 'Shifts', hidden: !isAdmin },
        ]}
      />
      {tab === 'me' && <MonthCalendar />}
      {tab === 'team' && <RosterView scope="team" />}
      {tab === 'all' && <RosterView scope="all" />}
      {tab === 'requests' && <RegularizationList scope="me" />}
      {tab === 'team-requests' && <RegularizationList scope="team" />}
      {tab === 'shifts' && <ShiftsAdmin />}
      <RegularizeModal open={regOpen} onClose={() => setRegOpen(false)} />
    </>
  );
}
