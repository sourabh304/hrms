'use client';

import { Briefcase, CalendarX2, Clock3, HandHeart, Hourglass, Scale, TrendingDown, UserPlus, Users } from 'lucide-react';
import { BarList, ColumnChart, MultiLineChart, TrendChart } from '@/components/charts';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { PageHeader, PageLoader, StatCard } from '@/components/ui/misc';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { useCurrency } from '@/features/organization/api';
import { formatMoney, humanize } from '@/lib/utils';
import { useWorkforceAnalytics } from '../api';

const pct = (part: number, total: number) => (total ? `${Math.round((part / total) * 100)}%` : '0%');

export function AnalyticsPage() {
  const { data, isLoading } = useWorkforceAnalytics();
  const currency = useCurrency();
  if (isLoading || !data) return <PageLoader />;
  const s = data.summary;
  const humanizeAll = (rows: { name: string; value: number }[]) => rows.map((r) => ({ ...r, name: humanize(r.name), hint: pct(r.value, s.headcount) }));

  return (
    <div className="space-y-6">
      <PageHeader title="People analytics" description="Real-time workforce insights across the organization." />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-8">
        <StatCard label="Headcount" value={s.headcount} icon={Users} />
        <StatCard label="New hires (month)" value={s.newHiresThisMonth} icon={UserPlus} tone="success" />
        <StatCard label="Attrition (12m)" value={`${s.attritionRate12m}%`} icon={TrendingDown} tone="warning" />
        <StatCard label="Avg. tenure" value={`${s.avgTenureYears} yrs`} icon={Hourglass} tone="info" />
        <StatCard label="Women in workforce" value={`${s.femaleRatio}%`} icon={Scale} tone="primary" />
        <StatCard label="On leave today" value={s.onLeaveToday} icon={CalendarX2} tone="info" />
        <StatCard label="Open positions" value={s.openPositions} icon={Briefcase} />
        <StatCard label="Kudos (30d)" value={s.kudosLast30Days} icon={HandHeart} tone="success" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Headcount trend" description="Employees on the books at each month end" />
          <CardContent><TrendChart data={data.trend} xKey="month" yKey="headcount" name="Headcount" /></CardContent>
        </Card>
        <Card>
          <CardHeader title="Hires vs exits" description="Monthly movement, last 12 months" />
          <CardContent><ColumnChart data={data.trend} xKey="month" series={[{ key: 'hires', name: 'Hires' }, { key: 'exits', name: 'Exits' }]} height={214} /></CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader title="By department" />
          <CardContent><BarList items={data.byDepartment.map((r) => ({ ...r, hint: pct(r.value, s.headcount) }))} /></CardContent>
        </Card>
        <Card>
          <CardHeader title="By location" />
          <CardContent><BarList items={data.byLocation.map((r) => ({ ...r, hint: pct(r.value, s.headcount) }))} /></CardContent>
        </Card>
        <Card>
          <CardHeader title="Workforce mix" />
          <CardContent className="space-y-5">
            <div><p className="mb-2 text-xs font-medium text-muted-foreground">Employment type</p><BarList items={humanizeAll(data.byEmploymentType)} /></div>
            <div><p className="mb-2 text-xs font-medium text-muted-foreground">Work mode</p><BarList items={humanizeAll(data.byWorkMode)} /></div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader title="Gender diversity by level" description="Headcount per career level" />
          <CardContent>
            <ColumnChart data={data.diversityByLevel} xKey="level" stacked series={[{ key: 'female', name: 'Women' }, { key: 'male', name: 'Men' }, { key: 'other', name: 'Other / undisclosed' }]} height={220} />
            <Table className="mt-4 text-xs">
              <THead><tr><TH>Level</TH>{data.diversityByLevel.map((d) => <TH key={d.level} className="text-right">{d.level}</TH>)}</tr></THead>
              <TBody>
                {(['female', 'male', 'other'] as const).map((k) => (
                  <TR key={k}>
                    <TD className="text-muted-foreground">{k === 'female' ? 'Women' : k === 'male' ? 'Men' : 'Other'}</TD>
                    {data.diversityByLevel.map((d) => <TD key={d.level} className="tabular text-right">{d[k]}</TD>)}
                  </TR>
                ))}
              </TBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader title="Tenure distribution" />
          <CardContent><ColumnChart data={data.tenureBuckets} xKey="name" series={[{ key: 'value', name: 'Employees' }]} height={220} /></CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader title="Leave utilization" description={`${new Date().getFullYear()} · days used of entitlement`} />
          <CardContent><BarList items={data.leaveUtilization.filter((l) => l.allocated > 0).map((l) => ({ name: l.name, value: l.used, hint: `/ ${l.allocated}` }))} /></CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader title="Payroll cost" description="Gross vs net pay per run" action={<Clock3 className="h-4 w-4 text-muted-foreground" />} />
          <CardContent>
            {data.payrollTrend.length ? <MultiLineChart data={data.payrollTrend} xKey="period" series={[{ key: 'gross', name: 'Gross' }, { key: 'net', name: 'Net' }]} format={(v) => formatMoney(v, currency, true)} /> : <p className="text-sm text-muted-foreground">No payroll runs yet.</p>}
          </CardContent>
        </Card>
      </div>

      {!!data.separationsByType.length && (
        <Card>
          <CardHeader title="Separations (last 12 months)" description="By type" />
          <CardContent><BarList items={data.separationsByType.map((r) => ({ ...r, name: humanize(r.name) }))} /></CardContent>
        </Card>
      )}
    </div>
  );
}
