import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageLoader } from '@/components/ui/misc';
import { HelpdeskPage } from '@/features/helpdesk/components/helpdesk-page';

export const metadata: Metadata = { title: 'Helpdesk' };

export default function Page() {
  return (
    <Suspense fallback={<PageLoader />}>
      <HelpdeskPage />
    </Suspense>
  );
}
