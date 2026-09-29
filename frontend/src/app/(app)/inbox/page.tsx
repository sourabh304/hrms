import type { Metadata } from 'next';
import { InboxPage } from '@/features/workflow/components/inbox';

export const metadata: Metadata = { title: 'Inbox' };

export default function Page() {
  return <InboxPage />;
}
