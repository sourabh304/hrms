import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageLoader } from '@/components/ui/misc';
import { EngagementPage } from '@/features/engagement/components/engagement-page';

export const metadata: Metadata = { title: 'Engagement' };

export default function Page() {
  return (
    <Suspense fallback={<PageLoader />}>
      <EngagementPage />
    </Suspense>
  );
}
