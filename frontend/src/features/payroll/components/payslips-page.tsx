'use client';

import { ChevronRight, Receipt } from 'lucide-react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { EmptyState, PageHeader, Skeleton, StatCard } from '@/components/ui/misc';
import { useAccess } from '@/features/auth/api';
import { MONTHS } from '@/lib/options';
import { formatMoney } from '@/lib/utils';
import { useMyPayslips } from '../api';
import { CompensationCard } from './compensation-card';

export function PayslipsPage() {
  const { data = [], isLoading } = useMyPayslips();
  const { employeeId } = useAccess();
  const ytd = data.filter((p) => p.year === new Date().getFullYear());
  const currency = data[0]?.currency ?? 'USD';

  return (
    <>
      <PageHeader title="Payslips" description="Your monthly pay statements and compensation." />
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <StatCard label="Year-to-date gross" value={formatMoney(ytd.reduce((s, p) => s + p.gross, 0), currency)} icon={Receipt} />
        <StatCard label="Year-to-date deductions" value={formatMoney(ytd.reduce((s, p) => s + p.totalDeductions, 0), currency)} tone="warning" />
        <StatCard label="Year-to-date net" value={formatMoney(ytd.reduce((s, p) => s + p.net, 0), currency)} tone="success" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <Card>
          <p className="border-b border-border px-5 py-4 text-sm font-semibold">Pay statements</p>
          {isLoading && <Skeleton className="m-5 h-40" />}
          {!isLoading && !data.length && <EmptyState icon={Receipt} title="No payslips yet" description="Payslips appear here once payroll is paid." />}
          <ul className="divide-y divide-border">
            {data.map((p) => (
              <li key={p.id}>
                <Link href={`/payslips/${p.id}`} className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/50">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-soft text-primary-soft-foreground">
                    <Receipt className="h-4.5 w-4.5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{MONTHS[p.month - 1]} {p.year}</p>
                    <p className="text-xs text-muted-foreground">{p.paidDays} paid days{p.lopDays ? ` · ${p.lopDays} LOP` : ''}</p>
                  </div>
                  <div className="text-right">
                    <p className="tabular text-sm font-semibold">{formatMoney(p.net, p.currency)}</p>
                    <p className="tabular text-xs text-muted-foreground">gross {formatMoney(p.gross, p.currency)}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
        {employeeId && <CompensationCard employeeId={employeeId} />}
      </div>
    </>
  );
}
