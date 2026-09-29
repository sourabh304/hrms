import type { Metadata } from 'next';
import { JobDetail } from '@/features/recruitment/components/job-detail';

export const metadata: Metadata = { title: 'Job requisition' };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <JobDetail id={id} />;
}
