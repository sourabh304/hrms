'use client';

import { ChevronsDownUp, ChevronsUpDown, Minus, Plus } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, PageHeader, PageLoader } from '@/components/ui/misc';
import { useOrgChart } from '@/features/employees/api';
import { EmployeePicker } from '@/features/employees/components/employee-picker';
import type { OrgChartNode } from '@/features/employees/types';
import { cn } from '@/lib/utils';
import './org-chart.css';

function countDescendants(id: string, childMap: Map<string, OrgChartNode[]>): number {
  return (childMap.get(id) ?? []).reduce((n, c) => n + 1 + countDescendants(c.id, childMap), 0);
}

function Node({
  node,
  childMap,
  expanded,
  toggle,
  focusId,
}: {
  node: OrgChartNode;
  childMap: Map<string, OrgChartNode[]>;
  expanded: Set<string>;
  toggle: (id: string) => void;
  focusId: string | null;
}) {
  const kids = childMap.get(node.id) ?? [];
  const open = expanded.has(node.id);
  const focused = focusId === node.id;
  return (
    <li>
      <div
        id={`org-${node.id}`}
        className={cn(
          'relative w-52 rounded-xl border bg-card px-3 py-3 text-left shadow-sm transition-shadow hover:shadow-md',
          focused ? 'border-primary ring-2 ring-primary/30' : 'border-border',
        )}
      >
        <Link href={`/employees/${node.id}`} className="flex items-center gap-2.5">
          <Avatar name={node.fullName} src={node.avatarUrl} size="md" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{node.fullName}</p>
            <p className="truncate text-[11px] text-muted-foreground">{node.designation}</p>
            <p className="truncate text-[11px] text-muted-foreground">
              {node.department} · {node.location}
            </p>
          </div>
        </Link>
        {kids.length > 0 && (
          <button
            onClick={() => toggle(node.id)}
            className="absolute -bottom-3 left-1/2 flex h-6 -translate-x-1/2 cursor-pointer items-center gap-1 rounded-full border border-border bg-card px-2 text-[10px] font-medium text-muted-foreground shadow-sm hover:text-foreground"
            aria-label={open ? 'Collapse team' : 'Expand team'}
          >
            {open ? <Minus className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
            {countDescendants(node.id, childMap)}
          </button>
        )}
      </div>
      {open && kids.length > 0 && (
        <ul>
          {kids.map((k) => (
            <Node key={k.id} node={k} childMap={childMap} expanded={expanded} toggle={toggle} focusId={focusId} />
          ))}
        </ul>
      )}
    </li>
  );
}

export function OrgChart() {
  const params = useSearchParams();
  const { data = [], isLoading } = useOrgChart();
  const [focusId, setFocusId] = useState<string | null>(params.get('focus'));
  const [override, setOverride] = useState<Set<string> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { roots, childMap, byId } = useMemo(() => {
    const byId = new Map(data.map((n) => [n.id, n]));
    const childMap = new Map<string, OrgChartNode[]>();
    const roots: OrgChartNode[] = [];
    for (const n of data) {
      if (n.managerId && byId.has(n.managerId)) {
        childMap.set(n.managerId, [...(childMap.get(n.managerId) ?? []), n]);
      } else roots.push(n);
    }
    for (const list of childMap.values()) list.sort((a, b) => (b.level ?? '').localeCompare(a.level ?? '', undefined, { numeric: true }) || a.fullName.localeCompare(b.fullName));
    return { roots, childMap, byId };
  }, [data]);

  /** Default view: top two levels, plus the reporting path to the focused person. */
  const defaultExpanded = useMemo(() => {
    const next = new Set<string>();
    for (const r of roots) {
      next.add(r.id);
      for (const c of childMap.get(r.id) ?? []) if (!focusId) next.add(c.id);
    }
    let cur = focusId ? byId.get(focusId) : undefined;
    while (cur?.managerId) {
      next.add(cur.managerId);
      cur = byId.get(cur.managerId);
    }
    return next;
  }, [roots, childMap, byId, focusId]);
  const expanded = override ?? defaultExpanded;

  // Scroll the focused card into view once rendered (DOM side effect only).
  useEffect(() => {
    if (!focusId || !data.length) return;
    const t = setTimeout(() => document.getElementById(`org-${focusId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' }), 150);
    return () => clearTimeout(t);
  }, [focusId, data.length]);

  const toggle = (id: string) => {
    const n = new Set(expanded);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    setOverride(n);
  };

  if (isLoading) return <PageLoader />;

  return (
    <>
      <PageHeader
        title="Organization chart"
        description={`${data.length} people · reporting structure`}
        actions={
          <>
            <div className="w-64">
              <EmployeePicker placeholder="Find a person…" onChange={(e) => { setFocusId(e?.id ?? null); setOverride(null); }} />
            </div>
            <Button variant="outline" onClick={() => setOverride(new Set(data.map((d) => d.id)))}>
              <ChevronsUpDown className="h-4 w-4" /> Expand all
            </Button>
            <Button variant="outline" onClick={() => setOverride(new Set(roots.map((r) => r.id)))}>
              <ChevronsDownUp className="h-4 w-4" /> Collapse
            </Button>
          </>
        }
      />
      <Card className="overflow-hidden">
        <div ref={containerRef} className="scrollbar-thin overflow-auto p-8" style={{ maxHeight: 'calc(100vh - 220px)' }}>
          <div className="org-tree inline-block min-w-full">
            <ul>
              {roots.map((r) => (
                <Node key={r.id} node={r} childMap={childMap} expanded={expanded} toggle={toggle} focusId={focusId} />
              ))}
            </ul>
          </div>
        </div>
      </Card>
    </>
  );
}
