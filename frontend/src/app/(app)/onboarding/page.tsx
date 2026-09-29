import type { Metadata } from 'next';
import { OnboardingPage } from '@/features/onboarding/components/onboarding-page';

export const metadata: Metadata = { title: 'Onboarding' };

export default function Page() {
  return <OnboardingPage />;
}
