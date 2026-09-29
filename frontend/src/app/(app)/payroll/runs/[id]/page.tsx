import type { Metadata } from 'next';
import { PayrollRunDetail } from '@/features/payroll/components/payroll-run-detail';

export const metadata: Metadata = { title: 'Payroll run' };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PayrollRunDetail id={id} />;
}
