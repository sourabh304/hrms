'use client';

import { Banknote, CalendarRange, Pencil, Play, Search, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { MultiLineChart } from '@/components/charts';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Field, Input, Select } from '@/components/ui/form-controls';
import { Modal } from '@/components/ui/modal';
import { EmptyState, PageHeader, PersonCell, Skeleton, StatCard } from '@/components/ui/misc';
import { Pagination, Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { Segmented, Tabs } from '@/components/ui/tabs';
import { useCurrency } from '@/features/organization/api';
import { MONTHS } from '@/lib/options';
import { formatDate, formatMoney, humanize, todayISO } from '@/lib/utils';
import { useCreateRun, usePayrollRuns, usePayrollSummary, useSalaryStructures, useSaveStructure, type EmployeeWithSalary, type SalaryComponent } from '../api';

const DEFAULTS: SalaryComponent[] = [
  { code: 'BASIC', name: 'Basic Salary', type: 'EARNING', calculation: 'PERCENT_OF_CTC', value: 50 },
  { code: 'HRA', name: 'Housing Allowance', type: 'EARNING', calculation: 'PERCENT_OF_BASIC', value: 40 },
  { code: 'TRANSPORT', name: 'Transport Allowance', type: 'EARNING', calculation: 'FIXED', value: 150 },
  { code: 'SPECIAL', name: 'Special Allowance', type: 'EARNING', calculation: 'BALANCE', value: 0 },
  { code: 'RETIREMENT', name: 'Retirement Fund', type: 'DEDUCTION', calculation: 'PERCENT_OF_BASIC', value: 12 },
  { code: 'HEALTH', name: 'Health Insurance', type: 'DEDUCTION', calculation: 'FIXED', value: 120 },
];

/** Client-side mirror of the server formula engine, for a live preview. */
function preview(ctc: number, components: SalaryComponent[]) {
  const monthly = ctc / 12;
  const basicDef = components.find((c) => c.code === 'BASIC');
  const basic = basicDef ? (basicDef.calculation === 'PERCENT_OF_CTC' ? (monthly * basicDef.value) / 100 : basicDef.value) : 0;
  const resolve = (c: SalaryComponent) => (c.calculation === 'FIXED' ? c.value : c.calculation === 'PERCENT_OF_CTC' ? (monthly * c.value) / 100 : c.calculation === 'PERCENT_OF_BASIC' ? (basic * c.value) / 100 : 0);
  const earnings = components.filter((c) => c.type === 'EARNING' && c.calculation !== 'BALANCE').map((c) => ({ ...c, amount: resolve(c) }));
  const used = earnings.reduce((s, e) => s + e.amount, 0);
  const bal = components.find((c) => c.type === 'EARNING' && c.calculation === 'BALANCE');
  if (bal) earnings.push({ ...bal, amount: Math.max(0, monthly - used) });
  const deductions = components.filter((c) => c.type === 'DEDUCTION').map((c) => ({ ...c, amount: resolve(c) }));
  return { earnings, deductions, gross: earnings.reduce((s, e) => s + e.amount, 0), deductionsTotal: deductions.reduce((s, d) => s + d.amount, 0) };
}

function StructureModal({ employee, onClose }: { employee: EmployeeWithSalary; onClose: () => void }) {
  const save = useSaveStructure();
  const currency = useCurrency();
  const [ctc, setCtc] = useState(String(employee.salary?.annualCtc ?? ''));
  const [effectiveFrom, setEffectiveFrom] = useState(todayISO());
  const [notes, setNotes] = useState('');
  const [components, setComponents] = useState<SalaryComponent[]>(employee.salary?.components ?? DEFAULTS);
  const p = preview(Number(ctc) || 0, components);
  const set = (i: number, patch: Partial<SalaryComponent>) => setComponents(components.map((c, j) => (j === i ? { ...c, ...patch } : c)));

  return (
    <Modal open onClose={onClose} size="xl" title={`Compensation — ${employee.fullName}`} description="Changes create a new revision and are recorded on the job history timeline."
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button loading={save.isPending} disabled={!Number(ctc)} onClick={async () => { await save.mutateAsync({ employeeId: employee.id, annualCtc: Number(ctc), effectiveFrom, components, notes: notes || undefined }); toast.success('Salary structure saved'); onClose(); }}>Save revision</Button></>}>
      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label={`Annual CTC (${currency})`} required><Input type="number" value={ctc} onChange={(e) => setCtc(e.target.value)} /></Field>
            <Field label="Effective from"><Input type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} /></Field>
            <Field label="Reason"><Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Annual increment" /></Field>
          </div>
          <div>
            <p className="mb-2 text-sm font-semibold">Components</p>
            <div className="space-y-2">
              {components.map((c, i) => (
                <div key={c.code} className="grid grid-cols-[1fr_110px_150px_90px] items-center gap-2">
                  <Input value={c.name} onChange={(e) => set(i, { name: e.target.value })} />
                  <Select value={c.type} onChange={(e) => set(i, { type: e.target.value as SalaryComponent['type'] })} options={[{ value: 'EARNING', label: 'Earning' }, { value: 'DEDUCTION', label: 'Deduction' }]} />
                  <Select value={c.calculation} onChange={(e) => set(i, { calculation: e.target.value as SalaryComponent['calculation'] })} options={[{ value: 'FIXED', label: 'Fixed / month' }, { value: 'PERCENT_OF_CTC', label: '% of CTC' }, { value: 'PERCENT_OF_BASIC', label: '% of basic' }, { value: 'BALANCE', label: 'Balancing' }]} />
                  <Input type="number" disabled={c.calculation === 'BALANCE'} value={c.value} onChange={(e) => set(i, { value: Number(e.target.value) })} />
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Income tax is withheld automatically using the company tax slabs.</p>
          </div>
        </div>
        <div className="rounded-xl bg-muted p-4 text-sm">
          <p className="mb-3 font-semibold">Monthly preview</p>
          {p.earnings.map((e) => <div key={e.code} className="flex justify-between py-0.5"><span className="text-muted-foreground">{e.name}</span><span className="tabular">{formatMoney(e.amount, currency)}</span></div>)}
          <div className="my-2 flex justify-between border-t border-border pt-2 font-medium"><span>Gross</span><span className="tabular">{formatMoney(p.gross, currency)}</span></div>
          {p.deductions.map((d) => <div key={d.code} className="flex justify-between py-0.5"><span className="text-muted-foreground">{d.name}</span><span className="tabular">−{formatMoney(d.amount, currency)}</span></div>)}
          <p className="mt-3 text-[11px] text-muted-foreground">Net pay is shown after tax on payslips.</p>
        </div>
      </div>
    </Modal>
  );
}

function StructuresTab() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'missing'>('all');
  const { data, isLoading } = useSalaryStructures({ page, search: search || undefined, filter });
  const [editing, setEditing] = useState<EmployeeWithSalary | null>(null);
  return (
    <Card>
      <div className="flex flex-wrap items-center gap-3 border-b border-border p-3">
        <div className="relative w-64"><Search className="absolute top-2.5 left-3 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Search employees" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} /></div>
        <Segmented value={filter} onChange={(v) => { setFilter(v as 'all' | 'missing'); setPage(1); }} options={[{ value: 'all', label: 'All' }, { value: 'missing', label: 'Missing structure' }]} />
      </div>
      <Table>
        <THead><tr><TH>Employee</TH><TH>Department</TH><TH className="text-right">Annual CTC</TH><TH className="text-right">Monthly</TH><TH>Effective</TH><TH /></tr></THead>
        <TBody>
          {isLoading && <tr><TD colSpan={6}><Skeleton className="h-24" /></TD></tr>}
          {data?.data.map((e) => (
            <TR key={e.id}>
              <TD><PersonCell name={e.fullName} src={e.avatarUrl} subtitle={`${e.employeeCode} · ${e.designation?.title ?? ''}`} /></TD>
              <TD className="text-muted-foreground">{e.department?.name}</TD>
              <TD className="tabular text-right font-medium">{e.salary ? formatMoney(e.salary.annualCtc, e.salary.currency) : <span className="text-warning">Not set</span>}</TD>
              <TD className="tabular text-right text-muted-foreground">{e.salary ? formatMoney(e.salary.annualCtc / 12, e.salary.currency) : '—'}</TD>
              <TD className="text-muted-foreground">{formatDate(e.salary?.effectiveFrom)}</TD>
              <TD className="text-right"><Button size="sm" variant="ghost" onClick={() => setEditing(e)}><Pencil className="h-3.5 w-3.5" /> {e.salary ? 'Revise' : 'Set up'}</Button></TD>
            </TR>
          ))}
        </TBody>
      </Table>
      {data && <Pagination page={page} totalPages={data.meta.totalPages} total={data.meta.total} onPage={setPage} />}
      {editing && <StructureModal employee={editing} onClose={() => setEditing(null)} />}
    </Card>
  );
}

function RunPayrollModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const create = useCreateRun();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  return (
    <Modal open onClose={onClose} title="Run payroll" description="Creates a draft run. Review the register, then process and mark paid to publish payslips."
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button loading={create.isPending} onClick={async () => { const run = await create.mutateAsync({ year, month }); toast.success('Draft payroll calculated'); onClose(); router.push(`/payroll/runs/${run.id}`); }}><Play className="h-4 w-4" /> Calculate</Button></>}>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Month"><Select value={String(month)} onChange={(e) => setMonth(Number(e.target.value))} options={MONTHS.map((m, i) => ({ value: String(i + 1), label: m }))} /></Field>
        <Field label="Year"><Input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} /></Field>
      </div>
      <ul className="mt-4 space-y-1 text-xs text-muted-foreground">
        <li>• Pro-rates new joiners and leavers by working days</li>
        <li>• Deducts approved unpaid leave as loss of pay</li>
        <li>• Withholds income tax from the configured slabs</li>
      </ul>
    </Modal>
  );
}

export function PayrollPage() {
  const router = useRouter();
  const { data: runs = [], isLoading } = usePayrollRuns();
  const { data: summary = [] } = usePayrollSummary();
  const currency = useCurrency();
  const [tab, setTab] = useState('runs');
  const [running, setRunning] = useState(false);
  const last = runs.find((r) => r.status === 'PAID');

  return (
    <>
      <PageHeader title="Payroll" description="Salary structures, monthly runs and payslips." actions={<Button onClick={() => setRunning(true)}><Play className="h-4 w-4" /> Run payroll</Button>} />
      <div className="mb-6 grid gap-4 lg:grid-cols-[repeat(3,minmax(0,1fr))_1.6fr]">
        <StatCard label="Last payroll (net)" value={last ? formatMoney(last.totalNet, currency, true) : '—'} hint={last ? `${MONTHS[last.month - 1]} ${last.year}` : undefined} icon={Banknote} tone="success" />
        <StatCard label="Employees paid" value={last?.employeeCount ?? '—'} icon={Users} />
        <StatCard label="Drafts pending" value={runs.filter((r) => r.status !== 'PAID').length} icon={CalendarRange} tone="warning" />
        <Card>
          <CardHeader title="Payroll cost trend" description="Gross vs net, last 12 runs" />
          <CardContent className="py-3">
            {summary.length ? <MultiLineChart data={summary} xKey="period" series={[{ key: 'gross', name: 'Gross' }, { key: 'net', name: 'Net' }]} height={140} format={(v) => formatMoney(v, currency, true)} /> : <p className="text-xs text-muted-foreground">No payroll history yet</p>}
          </CardContent>
        </Card>
      </div>
      <Tabs className="mb-6" value={tab} onChange={setTab} tabs={[{ value: 'runs', label: 'Payroll runs' }, { value: 'structures', label: 'Salary structures' }]} />
      {tab === 'runs' && (
        <Card>
          <Table>
            <THead><tr><TH>Period</TH><TH>Employees</TH><TH className="text-right">Gross</TH><TH className="text-right">Deductions</TH><TH className="text-right">Net pay</TH><TH>Status</TH><TH>Paid on</TH></tr></THead>
            <TBody>
              {isLoading && <tr><TD colSpan={7}><Skeleton className="h-24" /></TD></tr>}
              {runs.map((r) => (
                <TR key={r.id} className="cursor-pointer" onClick={() => router.push(`/payroll/runs/${r.id}`)}>
                  <TD className="font-medium">{MONTHS[r.month - 1]} {r.year}</TD>
                  <TD className="tabular">{r.employeeCount}</TD>
                  <TD className="tabular text-right">{formatMoney(r.totalGross, r.currency)}</TD>
                  <TD className="tabular text-right text-muted-foreground">{formatMoney(r.totalDeductions, r.currency)}</TD>
                  <TD className="tabular text-right font-semibold">{formatMoney(r.totalNet, r.currency)}</TD>
                  <TD><StatusBadge status={r.status} /></TD>
                  <TD className="text-muted-foreground">{formatDate(r.paidAt)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
          {!isLoading && !runs.length && <EmptyState icon={Banknote} title="No payroll runs yet" />}
        </Card>
      )}
      {tab === 'structures' && <StructuresTab />}
      {running && <RunPayrollModal onClose={() => setRunning(false)} />}
      <p className="mt-4 text-xs text-muted-foreground">Status flow: {['DRAFT', 'PROCESSED', 'PAID'].map(humanize).join(' → ')}. Payslips become visible to employees once a run is marked paid.</p>
    </>
  );
}
