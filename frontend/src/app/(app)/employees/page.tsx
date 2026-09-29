import type { Metadata } from 'next';
import { EmployeeList } from '@/features/employees/components/employee-list';

export const metadata: Metadata = { title: 'Employees' };

export default function EmployeesPage() {
  return <EmployeeList />;
}
