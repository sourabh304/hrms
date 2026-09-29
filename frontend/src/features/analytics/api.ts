'use client';

import { useQuery } from '@tanstack/react-query';
import { get } from '@/lib/api-client';

export interface NameValue {
  name: string;
  value: number;
}

export interface WorkforceAnalytics {
  summary: {
    headcount: number;
    newHiresThisMonth: number;
    exitsThisMonth: number;
    attritionRate12m: number;
    avgTenureYears: number;
    onProbation: number;
    onNotice: number;
    presentToday: number;
    onLeaveToday: number;
    openPositions: number;
    pendingApprovals: number;
    kudosLast30Days: number;
    femaleRatio: number;
  };
  trend: { month: string; headcount: number; hires: number; exits: number }[];
  byDepartment: NameValue[];
  byLocation: NameValue[];
  byEmploymentType: NameValue[];
  byGender: NameValue[];
  byWorkMode: NameValue[];
  tenureBuckets: NameValue[];
  diversityByLevel: { level: string; female: number; male: number; other: number }[];
  leaveUtilization: { name: string; used: number; allocated: number; color: string }[];
  payrollTrend: { period: string; gross: number; net: number }[];
  separationsByType: NameValue[];
}

export const useWorkforceAnalytics = (enabled = true) =>
  useQuery({ queryKey: ['analytics', 'workforce'], queryFn: () => get<WorkforceAnalytics>('/analytics/workforce'), enabled, staleTime: 60_000 });
