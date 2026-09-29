import type { Metadata } from 'next';
import { CareerDetail } from '@/features/careers/components/careers';

export const metadata: Metadata = { title: 'Careers' };

export default async function CareerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CareerDetail id={id} />;
}
