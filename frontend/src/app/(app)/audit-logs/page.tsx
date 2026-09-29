import type { Metadata } from 'next';
import { AuditPage } from '@/features/audit/components/audit-page';

export const metadata: Metadata = { title: 'Audit logs' };

export default function Page() {
  return <AuditPage />;
}
