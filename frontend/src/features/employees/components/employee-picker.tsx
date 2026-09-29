'use client';

import { Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Avatar } from '@/components/ui/misc';
import { cn } from '@/lib/utils';
import { useEmployeeLookup } from '../api';
import type { LookupEmployee } from '../types';

/** Async people search used anywhere an employee must be chosen. */
export function EmployeePicker({
  value,
  onChange,
  placeholder = 'Search employees…',
  exclude,
  initialLabel,
}: {
  value?: string | null;
  onChange: (employee: LookupEmployee | null) => void;
  placeholder?: string;
  exclude?: string[];
  initialLabel?: string | null;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<{ id: string; fullName: string } | null>(
    value && initialLabel ? { id: value, fullName: initialLabel } : null,
  );
  const ref = useRef<HTMLDivElement>(null);
  const { data = [], isFetching } = useEmployeeLookup(query, open);

  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    if (!value) setSelected(null);
  }

  useEffect(() => {
    const onClick = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const results = data.filter((e) => !exclude?.includes(e.id));

  if (selected) {
    return (
      <div className="flex h-9 items-center gap-2 rounded-lg border border-input bg-card px-2.5">
        <Avatar name={selected.fullName} size="xs" />
        <span className="flex-1 truncate text-sm">{selected.fullName}</span>
        <button
          type="button"
          onClick={() => {
            setSelected(null);
            onChange(null);
          }}
          className="cursor-pointer text-muted-foreground hover:text-foreground"
          aria-label="Clear selection"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <Search className="pointer-events-none absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
      <input
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        placeholder={placeholder}
        className="h-9 w-full rounded-lg border border-input bg-card pr-3 pl-8 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
      />
      {open && (
        <ul className="scrollbar-thin absolute z-30 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-border bg-card py-1 shadow-lg">
          {isFetching && !results.length && <li className="px-3 py-2 text-xs text-muted-foreground">Searching…</li>}
          {!isFetching && !results.length && <li className="px-3 py-2 text-xs text-muted-foreground">No matches</li>}
          {results.map((e) => (
            <li key={e.id}>
              <button
                type="button"
                onClick={() => {
                  setSelected({ id: e.id, fullName: e.fullName });
                  setOpen(false);
                  setQuery('');
                  onChange(e);
                }}
                className={cn('flex w-full cursor-pointer items-center gap-2.5 px-3 py-1.5 text-left hover:bg-muted')}
              >
                <Avatar name={e.fullName} src={e.avatarUrl} size="xs" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{e.fullName}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {e.designation} · {e.employeeCode}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
