import type { Metadata } from 'next';
import { CareersList } from '@/features/careers/components/careers';

export const metadata: Metadata = { title: 'Careers' };

export default function CareersPage() {
  return <CareersList />;
}
