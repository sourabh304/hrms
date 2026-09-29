'use client';

import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex h-96 flex-col items-center justify-center gap-3 text-center">
      <AlertTriangle className="h-8 w-8 text-warning" />
      <p className="font-medium">Something went wrong on this page.</p>
      <p className="max-w-md text-sm text-muted-foreground">{error.message}</p>
      <Button variant="outline" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
