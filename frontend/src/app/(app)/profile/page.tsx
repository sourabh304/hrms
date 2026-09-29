import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageLoader } from '@/components/ui/misc';
import { ProfilePage } from '@/features/profile/components/profile-page';

export const metadata: Metadata = { title: 'My profile' };

export default function Page() {
  return (
    <Suspense fallback={<PageLoader />}>
      <ProfilePage />
    </Suspense>
  );
}
