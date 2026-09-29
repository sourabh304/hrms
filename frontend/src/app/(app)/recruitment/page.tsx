import type { Metadata } from 'next';
import { RecruitmentPage } from '@/features/recruitment/components/recruitment-page';

export const metadata: Metadata = { title: 'Recruitment' };

export default function Page() {
  return <RecruitmentPage />;
}
