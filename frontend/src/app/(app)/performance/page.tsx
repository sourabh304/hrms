import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageLoader } from '@/components/ui/misc';
import { PerformancePage } from '@/features/performance/components/performance-page';

export const metadata: Metadata = { title: 'Performance' };

export default function Page() {
  return (
    <Suspense fallback={<PageLoader />}>
      <PerformancePage />
    </Suspense>
  );
}
