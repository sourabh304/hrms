import type { Metadata } from 'next';
import { AttendancePage } from '@/features/attendance/components/attendance-page';

export const metadata: Metadata = { title: 'Attendance' };

export default function Page() {
  return <AttendancePage />;
}
