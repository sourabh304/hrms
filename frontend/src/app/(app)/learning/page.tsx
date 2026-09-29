import type { Metadata } from 'next';
import { LearningPage } from '@/features/learning/components/learning-page';

export const metadata: Metadata = { title: 'Learning' };

export default function Page() {
  return <LearningPage />;
}
