import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageLoader } from '@/components/ui/misc';
import { ExpensesPage } from '@/features/expenses/components/expenses-page';

export const metadata: Metadata = { title: 'Expenses' };

export default function Page() {
  return (
    <Suspense fallback={<PageLoader />}>
      <ExpensesPage />
    </Suspense>
  );
}
