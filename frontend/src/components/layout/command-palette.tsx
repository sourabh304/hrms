'use client';

import { useQuery } from '@tanstack/react-query';
import { CornerDownLeft, Search, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Avatar } from '@/components/ui/misc';
import { useAccess } from '@/features/auth/api';
import type { LookupEmployee } from '@/features/employees/types';
import { get } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { NAVIGATION } from './nav-config';

interface Result {
  key: string;
  label: string;
  hint: string;
  href: string;
  person?: LookupEmployee;
  icon?: (typeof NAVIGATION)[number]['items'][number]['icon'];
}

/** ⌘K / Ctrl+K global search across pages and people. */
export function CommandPalette({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { user } = useAccess();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const q = query.trim();
  const { data: people = [] } = useQuery({
    queryKey: ['lookup', q],
    queryFn: () => get<LookupEmployee[]>('/employees/lookup', { search: q }),
    enabled: q.length >= 2,
    staleTime: 60_000,
  });

  const results = useMemo<Result[]>(() => {
    const perms = user?.permissions ?? [];
    const pages = NAVIGATION.flatMap((s) => s.items.map((i) => ({ ...i, section: s.title })))
      .filter((i) => !i.anyOf || i.anyOf.some((p) => perms.includes(p)))
      .filter((i) => !q || `${i.label} ${i.keywords ?? ''}`.toLowerCase().includes(q.toLowerCase()))
      .slice(0, q ? 6 : 8)
      .map((i) => ({ key: i.href, label: i.label, hint: i.section, href: i.href, icon: i.icon }));
    const persons = people.slice(0, 6).map((p) => ({
      key: p.id,
      label: p.fullName,
      hint: `${p.designation ?? ''} · ${p.employeeCode}`,
      href: `/employees/${p.id}`,
      person: p,
    }));
    return [...persons, ...pages];
  }, [q, people, user]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  if (typeof document === 'undefined') return null;

  const go = (r?: Result) => {
    if (!r) return;
    onClose();
    router.push(r.href);
  };

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 pt-[12vh]">
      <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center gap-3 border-b border-border px-4">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose();
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, results.length - 1));
              }
              if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              }
              if (e.key === 'Enter') go(results[active]);
            }}
            placeholder="Search people, pages and actions…"
            className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            aria-label="Search"
          />
          <kbd className="rounded border border-border px-1.5 text-[10px] text-muted-foreground">ESC</kbd>
        </div>
        <ul className="scrollbar-thin max-h-96 overflow-y-auto p-2">
          {results.length === 0 && <li className="px-3 py-8 text-center text-sm text-muted-foreground">No results for “{q}”</li>}
          {results.map((r, i) => (
            <li key={r.key}>
              <button
                onMouseEnter={() => setActive(i)}
                onClick={() => go(r)}
                className={cn('flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left', i === active && 'bg-muted')}
              >
                {r.person ? (
                  <Avatar name={r.person.fullName} src={r.person.avatarUrl} size="xs" />
                ) : r.icon ? (
                  <r.icon className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <User className="h-4 w-4" />
                )}
                <span className="flex-1 truncate text-sm">{r.label}</span>
                <span className="truncate text-xs text-muted-foreground">{r.hint}</span>
                {i === active && <CornerDownLeft className="h-3.5 w-3.5 text-muted-foreground" />}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>,
    document.body,
  );
}
