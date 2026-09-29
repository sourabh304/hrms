'use client';

import { Download, Plus, Search, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button, LinkButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/badge';
import { Input, Select } from '@/components/ui/form-controls';
import { EmptyState, PageHeader, PersonCell, Skeleton } from '@/components/ui/misc';
import { Pagination, Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { useAccess } from '@/features/auth/api';
import { PERMISSIONS } from '@/features/auth/types';
import { useDepartments, useLocations } from '@/features/organization/api';
import { get, type Paginated } from '@/lib/api-client';
import { EMPLOYEE_STATUSES, EMPLOYMENT_TYPES, enumOptions } from '@/lib/options';
import { formatDate, humanize } from '@/lib/utils';
import { useEmployees, type EmployeeFilters } from '../api';
import type { Employee } from '../types';

async function exportCsv(filters: EmployeeFilters) {
  const { data } = await get<Paginated<Employee>>('/employees', { ...filters, page: 1, limit: 500 });
  const header = ['Code', 'Name', 'Email', 'Designation', 'Department', 'Location', 'Manager', 'Type', 'Status', 'Joined'];
  const rows = data.map((e) => [e.employeeCode, e.fullName, e.workEmail, e.designation?.title, e.department?.name, e.location?.name, e.manager?.fullName, e.employmentType, e.status, e.dateOfJoining]);
  const csv = [header, ...rows].map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: `employees-${new Date().toISOString().slice(0, 10)}.csv` });
  a.click();
  URL.revokeObjectURL(url);
}

export function EmployeeList() {
  const router = useRouter();
  const { can } = useAccess();
  const [filters, setFilters] = useState<EmployeeFilters>({ page: 1, sort: 'name' });
  const { data, isLoading } = useEmployees(filters);
  const { data: departments = [] } = useDepartments();
  const { data: locations = [] } = useLocations();
  const set = (patch: Partial<EmployeeFilters>) => setFilters((f) => ({ ...f, ...patch, page: patch.page ?? 1 }));

  return (
    <>
      <PageHeader
        title="Employees"
        description={data ? `${data.meta.total} people in the directory` : 'Company directory'}
        actions={
          <>
            <Button variant="outline" onClick={() => exportCsv(filters)}>
              <Download className="h-4 w-4" /> Export
            </Button>
            {can(PERMISSIONS.EMPLOYEE_WRITE) && (
              <LinkButton href="/employees/new">
                <Plus className="h-4 w-4" /> Add employee
              </LinkButton>
            )}
          </>
        }
      />

      <Card>
        <div className="grid gap-3 border-b border-border p-4 md:grid-cols-[1fr_repeat(4,minmax(0,170px))]">
          <div className="relative">
            <Search className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search name, email or code" className="pl-9" value={filters.search ?? ''} onChange={(e) => set({ search: e.target.value })} />
          </div>
          <Select placeholder="All departments" options={departments.map((d) => ({ value: d.id, label: d.name }))} value={filters.departmentId ?? ''} onChange={(e) => set({ departmentId: e.target.value || undefined })} />
          <Select placeholder="All locations" options={locations.map((l) => ({ value: l.id, label: l.name }))} value={filters.locationId ?? ''} onChange={(e) => set({ locationId: e.target.value || undefined })} />
          <Select placeholder="Active statuses" options={enumOptions(EMPLOYEE_STATUSES)} value={filters.status ?? ''} onChange={(e) => set({ status: e.target.value || undefined })} />
          <Select placeholder="All types" options={enumOptions(EMPLOYMENT_TYPES)} value={filters.employmentType ?? ''} onChange={(e) => set({ employmentType: e.target.value || undefined })} />
        </div>

        <Table>
          <THead>
            <tr>
              <TH>Employee</TH>
              <TH>Code</TH>
              <TH>Department</TH>
              <TH>Location</TH>
              <TH>Manager</TH>
              <TH>Type</TH>
              <TH>Status</TH>
              <TH>Joined</TH>
            </tr>
          </THead>
          <TBody>
            {isLoading &&
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  <TD colSpan={8}>
                    <Skeleton className="h-8 w-full" />
                  </TD>
                </tr>
              ))}
            {data?.data.map((e) => (
              <TR key={e.id} className="cursor-pointer" onClick={() => router.push(`/employees/${e.id}`)}>
                <TD>
                  <PersonCell name={e.fullName} src={e.avatarUrl} subtitle={e.designation?.title ?? e.workEmail} />
                </TD>
                <TD className="font-mono text-xs text-muted-foreground">{e.employeeCode}</TD>
                <TD>{e.department?.name ?? '—'}</TD>
                <TD>{e.location?.city ?? '—'}</TD>
                <TD className="text-muted-foreground">{e.manager?.fullName ?? '—'}</TD>
                <TD className="text-muted-foreground">{humanize(e.employmentType)}</TD>
                <TD>
                  <StatusBadge status={e.status} />
                </TD>
                <TD className="whitespace-nowrap text-muted-foreground">{formatDate(e.dateOfJoining)}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
        {data && !data.data.length && <EmptyState icon={Users} title="No employees match these filters" />}
        {data && <Pagination page={data.meta.page} totalPages={data.meta.totalPages} total={data.meta.total} onPage={(page) => set({ page })} />}
      </Card>
    </>
  );
}
