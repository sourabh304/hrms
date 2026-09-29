'use client';

import { Briefcase, CalendarPlus, CalendarX2, Clock3, HandHeart, LifeBuoy, TrendingDown, UserCheck, Users, Wallet } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { TrendChart } from '@/components/charts';
import { Button, LinkButton } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { StatCard } from '@/components/ui/misc';
import { useWorkforceAnalytics } from '@/features/analytics/api';
import { ClockCard } from '@/features/attendance/components/clock-card';
import { useAccess } from '@/features/auth/api';
import { PERMISSIONS } from '@/features/auth/types';
import { ApplyLeaveModal } from '@/features/leave/components/apply-leave-modal';
import { BalanceCards } from '@/features/leave/components/balance-cards';
import {
  AcknowledgmentsWidget,
  AnnouncementsWidget,
  ApprovalsWidget,
  CelebrationsWidget,
  GoalsWidget,
  HolidaysWidget,
  MyTasksWidget,
  TeamTodayWidget,
} from './widgets';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

function WorkforceSnapshot() {
  const { data } = useWorkforceAnalytics();
  if (!data) return null;
  const s = data.summary;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Headcount" value={s.headcount} hint={`+${s.newHiresThisMonth} this month`} icon={Users} />
        <StatCard label="Present today" value={s.presentToday} hint={`${s.headcount ? Math.round((s.presentToday / s.headcount) * 100) : 0}% of workforce`} icon={UserCheck} tone="success" />
        <StatCard label="On leave today" value={s.onLeaveToday} icon={CalendarX2} tone="info" />
        <StatCard label="Open positions" value={s.openPositions} icon={Briefcase} tone="primary" />
        <StatCard label="Attrition (12m)" value={`${s.attritionRate12m}%`} hint={`${s.onNotice} serving notice`} icon={TrendingDown} tone="warning" />
        <StatCard label="Pending approvals" value={s.pendingApprovals} hint="Across the organization" icon={Clock3} tone="danger" />
      </div>
      <Card>
        <CardHeader title="Headcount — last 12 months" description="Employees on payroll at each month end" action={<Link href="/analytics" className="text-xs font-medium text-primary hover:underline">Full analytics →</Link>} />
        <CardContent>
          <TrendChart data={data.trend} xKey="month" yKey="headcount" name="Headcount" height={220} />
        </CardContent>
      </Card>
    </div>
  );
}

export function Dashboard() {
  const { user, can, isManager } = useAccess();
  const [leaveOpen, setLeaveOpen] = useState(false);
  const firstName = user?.employee?.firstName ?? 'there';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {greeting()}, {firstName} 👋
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setLeaveOpen(true)}><CalendarPlus className="h-4 w-4" /> Time off</Button>
          <LinkButton href="/expenses?new=1" variant="outline"><Wallet className="h-4 w-4" /> Expense</LinkButton>
          <LinkButton href="/helpdesk?new=1" variant="outline"><LifeBuoy className="h-4 w-4" /> Ask HR</LinkButton>
          <LinkButton href="/engagement?kudos=1"><HandHeart className="h-4 w-4" /> Give kudos</LinkButton>
        </div>
      </div>

      <AcknowledgmentsWidget />

      <div className="grid gap-6 lg:grid-cols-3">
        <ClockCard />
        <Card className="lg:col-span-2">
          <CardHeader title="Leave balance" description={`${new Date().getFullYear()} entitlement`} action={<Link href="/leave" className="text-xs font-medium text-primary hover:underline">Manage leave →</Link>} />
          <CardContent>
            <BalanceCards compact />
          </CardContent>
        </Card>
      </div>

      {can(PERMISSIONS.ANALYTICS_VIEW) && <WorkforceSnapshot />}

      <div className="grid gap-6 lg:grid-cols-3">
        {isManager && <ApprovalsWidget />}
        {isManager && <TeamTodayWidget />}
        <MyTasksWidget />
        <GoalsWidget />
        {!isManager && <AnnouncementsWidget />}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {isManager && <AnnouncementsWidget />}
        <CelebrationsWidget />
        <HolidaysWidget />
      </div>

      <ApplyLeaveModal open={leaveOpen} onClose={() => setLeaveOpen(false)} />
    </div>
  );
}
