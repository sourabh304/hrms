'use client';

import { Bell, CheckCheck, KeyRound, LogOut, Menu, Moon, Search, Sun, UserCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/components/theme';
import { Button } from '@/components/ui/button';
import { Dropdown, DropdownItem } from '@/components/ui/dropdown';
import { Avatar } from '@/components/ui/misc';
import { useLogout, useSession } from '@/features/auth/api';
import { useMarkAllRead, useMarkRead, useNotifications } from '@/features/notifications/api';
import { cn, humanize, timeAgo } from '@/lib/utils';

const NOTE_DOT = { INFO: 'bg-info', SUCCESS: 'bg-success', WARNING: 'bg-warning', ACTION: 'bg-primary' } as const;

function NotificationBell() {
  const router = useRouter();
  const { data } = useNotifications();
  const markRead = useMarkRead();
  const markAll = useMarkAllRead();
  const unread = data?.unread ?? 0;

  return (
    <Dropdown
      className="w-[22rem]"
      trigger={({ toggle }) => (
        <Button variant="ghost" size="icon" onClick={toggle} aria-label={`Notifications (${unread} unread)`} className="relative">
          <Bell className="h-[18px] w-[18px]" />
          {unread > 0 && (
            <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[9px] font-bold text-white">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </Button>
      )}
    >
      {(close) => (
        <div>
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-sm font-semibold">Notifications</p>
            {unread > 0 && (
              <button onClick={() => markAll.mutate()} className="flex cursor-pointer items-center gap-1 text-xs text-primary hover:underline">
                <CheckCheck className="h-3.5 w-3.5" /> Mark all read
              </button>
            )}
          </div>
          <ul className="scrollbar-thin max-h-96 overflow-y-auto">
            {!data?.items.length && <li className="px-4 py-10 text-center text-sm text-muted-foreground">You&apos;re all caught up</li>}
            {data?.items.slice(0, 12).map((n) => (
              <li key={n.id}>
                <button
                  onClick={() => {
                    if (!n.isRead) markRead.mutate(n.id);
                    close();
                    if (n.link) router.push(n.link);
                  }}
                  className={cn('flex w-full cursor-pointer gap-3 border-b border-border px-4 py-3 text-left last:border-0 hover:bg-muted', !n.isRead && 'bg-primary-soft/40')}
                >
                  <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', n.isRead ? 'bg-transparent' : NOTE_DOT[n.type])} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm leading-snug">{n.title}</span>
                    {n.message && <span className="mt-0.5 block truncate text-xs text-muted-foreground">{n.message}</span>}
                    <span className="mt-1 block text-[11px] text-muted-foreground">{timeAgo(n.createdAt)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <Link href="/notifications" onClick={close} className="block border-t border-border py-2.5 text-center text-xs font-medium text-primary hover:bg-muted">
            View all notifications
          </Link>
        </div>
      )}
    </Dropdown>
  );
}

export function Topbar({ onMenu, onSearch }: { onMenu: () => void; onSearch: () => void }) {
  const router = useRouter();
  const { data: user } = useSession();
  const logout = useLogout();
  const { theme, toggle } = useTheme();
  const name = user?.employee?.fullName ?? user?.email;

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-card/85 px-4 backdrop-blur md:px-6">
      <Button variant="ghost" size="icon" className="md:hidden" onClick={onMenu} aria-label="Open navigation">
        <Menu className="h-5 w-5" />
      </Button>

      <button
        onClick={onSearch}
        className="flex h-9 w-full max-w-md cursor-pointer items-center gap-2.5 rounded-lg border border-border bg-muted/60 px-3 text-sm text-muted-foreground transition-colors hover:border-input"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 truncate text-left">Search people, pages…</span>
        <kbd className="hidden rounded border border-border bg-card px-1.5 text-[10px] sm:inline">Ctrl K</kbd>
      </button>

      <div className="ml-auto flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
          {theme === 'dark' ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
        </Button>
        <NotificationBell />
        <Dropdown
          trigger={({ toggle: open }) => (
            <button onClick={open} className="ml-1 flex cursor-pointer items-center gap-2.5 rounded-lg p-1 pr-2 hover:bg-muted" aria-label="Account menu">
              <Avatar name={name} src={user?.employee?.avatarUrl} size="sm" />
              <span className="hidden text-left leading-tight lg:block">
                <span className="block text-sm font-medium">{name}</span>
                <span className="block text-[11px] text-muted-foreground">{user?.employee?.designation?.title ?? humanize(user?.roles[0])}</span>
              </span>
            </button>
          )}
        >
          {(close) => (
            <div className="py-1">
              <div className="border-b border-border px-3.5 py-2.5">
                <p className="text-sm font-medium">{name}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {user?.roles.filter((r) => r !== 'EMPLOYEE').map((r) => (
                    <span key={r} className="rounded bg-primary-soft px-1.5 py-0.5 text-[10px] font-medium text-primary-soft-foreground">
                      {humanize(r)}
                    </span>
                  ))}
                </div>
              </div>
              <DropdownItem onClick={() => { close(); router.push('/profile'); }}>
                <UserCircle className="h-4 w-4" /> My profile
              </DropdownItem>
              <DropdownItem onClick={() => { close(); router.push('/profile?tab=security'); }}>
                <KeyRound className="h-4 w-4" /> Change password
              </DropdownItem>
              <DropdownItem danger onClick={() => logout.mutate()}>
                <LogOut className="h-4 w-4" /> Sign out
              </DropdownItem>
            </div>
          )}
        </Dropdown>
      </div>
    </header>
  );
}
