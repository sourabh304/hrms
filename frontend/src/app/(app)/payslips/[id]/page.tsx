import type { Metadata } from 'next';
import { PayslipView } from '@/features/payroll/components/payslip-view';

export const metadata: Metadata = { title: 'Payslip' };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PayslipView id={id} />;
}
