'use client';

import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { Toaster, toast } from 'sonner';
import { ApiError } from '@/lib/api-client';
import { useTheme } from './theme';

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: (count, err) => !(err instanceof ApiError && err.status < 500) && count < 2,
          },
        },
        // Surface every failed mutation; success toasts are owned by each feature.
        mutationCache: new MutationCache({
          onError: (err, _vars, _ctx, mutation) => {
            if (mutation.meta?.silent) return;
            toast.error(err instanceof Error ? err.message : 'Something went wrong');
          },
        }),
      }),
  );
  const { theme } = useTheme();

  return (
    <QueryClientProvider client={client}>
      {children}
      <Toaster position="bottom-right" theme={theme} richColors closeButton />
    </QueryClientProvider>
  );
}
