import type { Metadata } from 'next';
import { LeavePage } from '@/features/leave/components/leave-page';

export const metadata: Metadata = { title: 'Leave' };

export default function Page() {
  return <LeavePage />;
}
