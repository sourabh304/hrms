'use client';

import { ArrowLeft, Printer } from 'lucide-react';
import Link from 'next/link';
import { LogoMark } from '@/components/brand';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PageLoader } from '@/components/ui/misc';
import { MONTHS } from '@/lib/options';
import { formatMoney } from '@/lib/utils';
import { usePayslip } from '../api';

/** Printable payslip — "Download PDF" uses the browser's print-to-PDF. */
export function PayslipView({ id }: { id: string }) {
  const { data: p, isLoading } = usePayslip(id);
  if (isLoading || !p) return <PageLoader />;
  const e = p.employee;
  const period = `${MONTHS[p.month - 1]} ${p.year}`;

  return (
    <>
      <div className="no-print mb-4 flex items-center justify-between">
        <Link href="/payslips" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Payslips</Link>
        <Button onClick={() => window.print()}><Printer className="h-4 w-4" /> Print / Save PDF</Button>
      </div>
      <Card className="mx-auto max-w-3xl p-8 print:border-0 print:shadow-none">
        <div className="flex items-start justify-between border-b border-border pb-6">
          <div className="flex items-center gap-3">
            <LogoMark className="h-10 w-10" />
            <div>
              <p className="text-lg font-semibold">{p.company?.name}</p>
              <p className="text-xs text-muted-foreground">{p.company?.legalName}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold tracking-wide uppercase">Payslip</p>
            <p className="text-sm text-muted-foreground">{period}</p>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-x-8 gap-y-2 border-b border-border py-6 text-sm md:grid-cols-3">
          {[
            ['Employee', e?.fullName],
            ['Employee code', e?.employeeCode],
            ['Designation', e?.designation?.title],
            ['Department', e?.department?.name],
            ['Location', e?.location?.name],
            ['Bank account', e?.bankDetails ? `${e.bankDetails.bankName} ••••${e.bankDetails.accountNumber.slice(-4)}` : '—'],
            ['Working days', p.workingDays],
            ['Paid days', p.paidDays],
            ['Loss of pay days', p.lopDays],
          ].map(([k, v]) => (
            <div key={k as string}>
              <dt className="text-xs text-muted-foreground">{k}</dt>
              <dd className="font-medium">{v ?? '—'}</dd>
            </div>
          ))}
        </dl>

        <div className="grid gap-8 py-6 md:grid-cols-2">
          {(['earnings', 'deductions'] as const).map((kind) => (
            <div key={kind}>
              <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{kind}</p>
              <table className="w-full text-sm">
                <tbody>
                  {p[kind].map((l) => (
                    <tr key={l.code} className="border-b border-border/60">
                      <td className="py-2">{l.name}</td>
                      <td className="tabular py-2 text-right">{formatMoney(l.amount, p.currency)}</td>
                    </tr>
                  ))}
                  <tr className="font-semibold">
                    <td className="py-2">Total {kind}</td>
                    <td className="tabular py-2 text-right">{formatMoney(kind === 'earnings' ? p.gross : p.totalDeductions, p.currency)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between rounded-xl bg-primary-soft px-6 py-4">
          <span className="text-sm font-medium text-primary-soft-foreground">Net pay for {period}</span>
          <span className="tabular text-2xl font-semibold">{formatMoney(p.net, p.currency)}</span>
        </div>
        <p className="mt-6 text-center text-[11px] text-muted-foreground">This is a system-generated payslip and does not require a signature.</p>
      </Card>
    </>
  );
}
