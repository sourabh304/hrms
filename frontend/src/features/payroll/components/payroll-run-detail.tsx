'use client';

import { ArrowLeft, CheckCircle2, Download, Lock, RefreshCcw, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/form-controls';
import { ConfirmDialog } from '@/components/ui/modal';
import { PageLoader, PersonCell, StatCard } from '@/components/ui/misc';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { MONTHS } from '@/lib/options';
import { formatDateTime, formatMoney } from '@/lib/utils';
import { usePayrollRun, useRunAction } from '../api';

export function PayrollRunDetail({ id }: { id: string }) {
  const router = useRouter();
  const { data: run, isLoading } = usePayrollRun(id);
  const action = useRunAction();
  const [confirm, setConfirm] = useState<null | 'finalize' | 'mark-paid' | 'delete'>(null);
  const [search, setSearch] = useState('');
  if (isLoading || !run) return <PageLoader />;

  const period = `${MONTHS[run.month - 1]} ${run.year}`;
  const slips = run.payslips.filter((p) => !search || p.employee?.fullName.toLowerCase().includes(search.toLowerCase()));
  const lop = run.payslips.filter((p) => p.lopDays > 0 || p.paidDays < p.workingDays);

  const exportRegister = () => {
    const header = ['Code', 'Employee', 'Department', 'Working days', 'Paid days', 'LOP', 'Gross', 'Deductions', 'Net'];
    const rows = run.payslips.map((p) => [p.employee?.employeeCode, p.employee?.fullName, p.employee?.department?.name, p.workingDays, p.paidDays, p.lopDays, p.gross, p.totalDeductions, p.net]);
    const csv = [header, ...rows].map((r) => r.map((v) => `"${String(v ?? '')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    Object.assign(document.createElement('a'), { href: url, download: `payroll-register-${run.year}-${String(run.month).padStart(2, '0')}.csv` }).click();
    URL.revokeObjectURL(url);
  };

  const confirmText = {
    finalize: ['Process payroll?', 'Locks the register. No further recalculation is possible.', 'Process'],
    'mark-paid': ['Mark as paid?', `Publishes ${run.employeeCount} payslips and notifies employees.`, 'Mark paid'],
    delete: ['Delete draft run?', 'The draft and its payslips will be removed.', 'Delete'],
  } as const;

  return (
    <>
      <Link href="/payroll" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Payroll</Link>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2"><h1 className="text-xl font-semibold">Payroll — {period}</h1><StatusBadge status={run.status} /></div>
          <p className="mt-1 text-sm text-muted-foreground">Period {run.periodStart} to {run.periodEnd}{run.processedAt && ` · processed ${formatDateTime(run.processedAt)}`}{run.paidAt && ` · paid ${formatDateTime(run.paidAt)}`}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={exportRegister}><Download className="h-4 w-4" /> Export register</Button>
          {run.status === 'DRAFT' && (
            <>
              <Button variant="ghost" onClick={() => setConfirm('delete')}><Trash2 className="h-4 w-4" /></Button>
              <Button variant="outline" loading={action.isPending && action.variables?.action === 'recalculate'} onClick={async () => { await action.mutateAsync({ id, action: 'recalculate' }); toast.success('Recalculated'); }}><RefreshCcw className="h-4 w-4" /> Recalculate</Button>
              <Button onClick={() => setConfirm('finalize')}><Lock className="h-4 w-4" /> Process</Button>
            </>
          )}
          {run.status === 'PROCESSED' && <Button variant="success" onClick={() => setConfirm('mark-paid')}><CheckCircle2 className="h-4 w-4" /> Mark as paid</Button>}
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Employees" value={run.employeeCount} />
        <StatCard label="Gross pay" value={formatMoney(run.totalGross, run.currency)} />
        <StatCard label="Deductions" value={formatMoney(run.totalDeductions, run.currency)} tone="warning" />
        <StatCard label="Net pay" value={formatMoney(run.totalNet, run.currency)} tone="success" hint={lop.length ? `${lop.length} pro-rated / LOP` : 'No pro-rations'} />
      </div>

      <Card>
        <div className="border-b border-border p-3"><Input className="w-64" placeholder="Search employee" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <Table>
          <THead><tr><TH>Employee</TH><TH>Department</TH><TH>Paid / working days</TH><TH className="text-right">Gross</TH><TH className="text-right">Tax</TH><TH className="text-right">Deductions</TH><TH className="text-right">Net</TH><TH /></tr></THead>
          <TBody>
            {slips.map((p) => (
              <TR key={p.id}>
                <TD><PersonCell name={p.employee!.fullName} src={p.employee!.avatarUrl} subtitle={p.employee!.employeeCode} /></TD>
                <TD className="text-muted-foreground">{p.employee?.department?.name}</TD>
                <TD className="tabular">{p.paidDays} / {p.workingDays}{p.lopDays > 0 && <span className="ml-1.5 text-xs text-danger">({p.lopDays} LOP)</span>}</TD>
                <TD className="tabular text-right">{formatMoney(p.gross, p.currency)}</TD>
                <TD className="tabular text-right text-muted-foreground">{formatMoney(p.deductions.find((d) => d.code === 'TAX')?.amount ?? 0, p.currency)}</TD>
                <TD className="tabular text-right text-muted-foreground">{formatMoney(p.totalDeductions, p.currency)}</TD>
                <TD className="tabular text-right font-semibold">{formatMoney(p.net, p.currency)}</TD>
                <TD className="text-right"><Link href={`/payslips/${p.id}`} className="text-xs text-primary hover:underline">Payslip</Link></TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Card>

      {confirm && (
        <ConfirmDialog
          open
          onClose={() => setConfirm(null)}
          title={confirmText[confirm][0]}
          message={confirmText[confirm][1]}
          confirmLabel={confirmText[confirm][2]}
          variant={confirm === 'delete' ? 'danger' : confirm === 'mark-paid' ? 'success' : 'primary'}
          loading={action.isPending}
          onConfirm={async () => {
            await action.mutateAsync({ id, action: confirm });
            setConfirm(null);
            if (confirm === 'delete') router.push('/payroll');
            else toast.success(confirm === 'finalize' ? 'Payroll processed' : 'Payroll paid — payslips published');
          }}
        />
      )}
    </>
  );
}
