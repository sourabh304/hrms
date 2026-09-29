'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ShieldCheck } from 'lucide-react';
import { Fragment, useState } from 'react';
import { Badge, type BadgeVariant } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input, Select } from '@/components/ui/form-controls';
import { EmptyState, PageHeader, Skeleton } from '@/components/ui/misc';
import { Pagination, Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { get, type Paginated } from '@/lib/api-client';
import { formatDateTime } from '@/lib/utils';

interface AuditLog {
  id: string;
  createdAt: string;
  userEmail: string | null;
  action: string;
  resource: string;
  resourceId: string | null;
  method: string;
  path: string;
  statusCode: number;
  ip: string | null;
  userAgent: string | null;
  payload: Record<string, unknown> | null;
}

const statusVariant = (code: number): BadgeVariant => (code >= 500 ? 'danger' : code >= 400 ? 'warning' : 'success');

export function AuditPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [resource, setResource] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const { data: resources = [] } = useQuery({ queryKey: ['audit', 'resources'], queryFn: () => get<string[]>('/audit-logs/resources') });
  const { data, isLoading } = useQuery({
    queryKey: ['audit', page, search, resource, from, to],
    queryFn: () => get<Paginated<AuditLog>>('/audit-logs', { page, limit: 25, search: search || undefined, resource: resource || undefined, from: from || undefined, to: to || undefined }),
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <PageHeader title="Audit logs" description="Tamper-evident record of every change made through the platform. Sensitive fields are redacted." />
      <Card>
        <div className="flex flex-wrap gap-3 border-b border-border p-3">
          <Input className="w-64" placeholder="Search user or path" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          <Select className="w-52" placeholder="All resources" value={resource} onChange={(e) => { setResource(e.target.value); setPage(1); }} options={resources.map((r) => ({ value: r, label: r }))} />
          <Input type="date" className="w-40" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} aria-label="From date" />
          <Input type="date" className="w-40" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} aria-label="To date" />
        </div>
        <Table>
          <THead><tr><TH>When</TH><TH>User</TH><TH>Action</TH><TH>Resource</TH><TH>Result</TH><TH>IP</TH></tr></THead>
          <TBody>
            {isLoading && <tr><TD colSpan={6}><Skeleton className="h-32" /></TD></tr>}
            {data?.data.map((a) => (
              <Fragment key={a.id}>
                <TR className="cursor-pointer" onClick={() => setOpen(open === a.id ? null : a.id)}>
                  <TD className="whitespace-nowrap text-muted-foreground">{formatDateTime(a.createdAt)}</TD>
                  <TD>{a.userEmail ?? <span className="text-muted-foreground">anonymous</span>}</TD>
                  <TD><Badge variant="primary">{a.action}</Badge></TD>
                  <TD className="font-mono text-xs">{a.resource}{a.resourceId && <span className="text-muted-foreground"> · {a.resourceId.slice(0, 8)}</span>}</TD>
                  <TD><Badge variant={statusVariant(a.statusCode)}>{a.statusCode}</Badge></TD>
                  <TD className="font-mono text-xs text-muted-foreground">{a.ip}</TD>
                </TR>
                {open === a.id && (
                  <tr>
                    <TD colSpan={6} className="bg-muted/40">
                      <p className="font-mono text-xs">{a.method} {a.path}</p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">{a.userAgent}</p>
                      {a.payload && <pre className="scrollbar-thin mt-2 max-h-56 overflow-auto rounded-lg bg-card p-3 text-xs">{JSON.stringify(a.payload, null, 2)}</pre>}
                    </TD>
                  </tr>
                )}
              </Fragment>
            ))}
          </TBody>
        </Table>
        {data && !data.data.length && <EmptyState icon={ShieldCheck} title="No audit events match" />}
        {data && <Pagination page={page} totalPages={data.meta.totalPages} total={data.meta.total} onPage={setPage} />}
      </Card>
    </>
  );
}
