'use client';

import { Banknote } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { EmptyState, Skeleton } from '@/components/ui/misc';
import { formatDate, formatMoney } from '@/lib/utils';
import { useCompensation } from '../api';

/** Current compensation package with the computed monthly breakdown. */
export function CompensationCard({ employeeId, action }: { employeeId: string; action?: React.ReactNode }) {
  const { data, isLoading } = useCompensation(employeeId);
  if (isLoading) return <Skeleton className="h-64" />;
  const s = data?.structure;

  return (
    <Card>
      <CardHeader
        title="Compensation"
        description={s ? `Effective ${formatDate(s.effectiveFrom)} · confidential` : 'Confidential'}
        action={action}
      />
      {!s || !data?.breakdown ? (
        <EmptyState icon={Banknote} title="No salary structure yet" description="Payroll admins can set up compensation for this employee." />
      ) : (
        <CardContent className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-muted p-3">
              <p className="text-xs text-muted-foreground">Annual CTC</p>
              <p className="mt-1 text-lg font-semibold">{formatMoney(s.annualCtc, s.currency)}</p>
            </div>
            <div className="rounded-lg bg-muted p-3">
              <p className="text-xs text-muted-foreground">Monthly gross</p>
              <p className="mt-1 text-lg font-semibold">{formatMoney(data.breakdown.gross, s.currency)}</p>
            </div>
            <div className="rounded-lg bg-success-soft p-3">
              <p className="text-xs text-success">Monthly net (est.)</p>
              <p className="mt-1 text-lg font-semibold text-foreground">{formatMoney(data.breakdown.net, s.currency)}</p>
            </div>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {(['earnings', 'deductions'] as const).map((kind) => (
              <div key={kind}>
                <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{kind}</p>
                <ul className="divide-y divide-border rounded-lg border border-border text-sm">
                  {data.breakdown![kind].map((l) => (
                    <li key={l.code} className="flex justify-between px-3 py-2">
                      <span>{l.name}</span>
                      <span className="tabular font-medium">{formatMoney(l.amount, s.currency)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          {data.history.length > 1 && (
            <div>
              <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Revision history</p>
              <ul className="space-y-1 text-sm">
                {data.history.map((h) => (
                  <li key={h.id} className="flex justify-between text-muted-foreground">
                    <span>{formatDate(h.effectiveFrom)}</span>
                    <span className="tabular text-foreground">{formatMoney(h.annualCtc, h.currency)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
