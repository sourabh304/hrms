import type { Metadata } from 'next';
import { OffboardingPage } from '@/features/offboarding/components/offboarding-page';

export const metadata: Metadata = { title: 'Offboarding' };

export default function Page() {
  return <OffboardingPage />;
}
