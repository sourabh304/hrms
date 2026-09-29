'use client';

import { Bell, CheckCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState, PageHeader, Skeleton } from '@/components/ui/misc';
import { cn, formatDateTime } from '@/lib/utils';
import { useMarkAllRead, useMarkRead, useNotifications } from '../api';

const DOT = { INFO: 'bg-info', SUCCESS: 'bg-success', WARNING: 'bg-warning', ACTION: 'bg-primary' } as const;

export function NotificationsPage() {
  const router = useRouter();
  const { data, isLoading } = useNotifications();
  const markRead = useMarkRead();
  const markAll = useMarkAllRead();
  return (
    <>
      <PageHeader title="Notifications" description={data ? `${data.unread} unread` : undefined} actions={<Button variant="outline" onClick={() => markAll.mutate()} disabled={!data?.unread}><CheckCheck className="h-4 w-4" /> Mark all read</Button>} />
      <Card>
        {isLoading && <Skeleton className="m-5 h-48" />}
        {data && !data.items.length && <EmptyState icon={Bell} title="No notifications" />}
        <ul className="divide-y divide-border">
          {data?.items.map((n) => (
            <li key={n.id}>
              <button
                onClick={() => { if (!n.isRead) markRead.mutate(n.id); if (n.link) router.push(n.link); }}
                className={cn('flex w-full cursor-pointer items-start gap-3 px-5 py-4 text-left hover:bg-muted/50', !n.isRead && 'bg-primary-soft/30')}
              >
                <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', n.isRead ? 'bg-muted-foreground/30' : DOT[n.type])} />
                <span className="flex-1">
                  <span className={cn('block text-sm', !n.isRead && 'font-medium')}>{n.title}</span>
                  {n.message && <span className="mt-0.5 block text-sm text-muted-foreground">{n.message}</span>}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">{formatDateTime(n.createdAt)}</span>
              </button>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
