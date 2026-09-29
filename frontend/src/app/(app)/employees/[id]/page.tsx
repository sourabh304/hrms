import type { Metadata } from 'next';
import { EmployeeDetail } from '@/features/employees/components/employee-detail';

export const metadata: Metadata = { title: 'Employee profile' };

export default async function EmployeePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EmployeeDetail id={id} />;
}
