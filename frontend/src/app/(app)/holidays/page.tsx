import type { Metadata } from 'next';
import { HolidaysPage } from '@/features/holidays/components/holidays-page';

export const metadata: Metadata = { title: 'Holidays' };

export default function Page() {
  return <HolidaysPage />;
}
