import type { Metadata } from 'next';
import { TicketDetail } from '@/features/helpdesk/components/ticket-detail';

export const metadata: Metadata = { title: 'Ticket' };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TicketDetail id={id} />;
}
