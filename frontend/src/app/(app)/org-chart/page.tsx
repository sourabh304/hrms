import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageLoader } from '@/components/ui/misc';
import { OrgChart } from '@/features/org-chart/components/org-chart';

export const metadata: Metadata = { title: 'Org chart' };

export default function OrgChartPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <OrgChart />
    </Suspense>
  );
}
