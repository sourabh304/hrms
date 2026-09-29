import type { Metadata } from 'next';
import { PayslipsPage } from '@/features/payroll/components/payslips-page';

export const metadata: Metadata = { title: 'Payslips' };

export default function Page() {
  return <PayslipsPage />;
}
