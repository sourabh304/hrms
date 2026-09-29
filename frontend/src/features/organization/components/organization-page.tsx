'use client';

import { Building2, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox, Field, Input, Select, Textarea } from '@/components/ui/form-controls';
import { ConfirmDialog, Modal } from '@/components/ui/modal';
import { EmptyState, PageHeader, PersonCell, StatCard } from '@/components/ui/misc';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { Tabs } from '@/components/ui/tabs';
import { EmployeePicker } from '@/features/employees/components/employee-picker';
import { useDeleteOrgItem, useDepartments, useDesignations, useLocations, useSaveOrgItem } from '../api';

type Kind = 'departments' | 'designations' | 'locations';
type Row = Record<string, unknown> & { id?: string; name?: string; title?: string };

function Editor({ kind, row, onClose }: { kind: Kind; row: Row; onClose: () => void }) {
  const save = useSaveOrgItem(kind);
  const { data: departments = [] } = useDepartments();
  const [r, setR] = useState<Row>(row);
  const str = (k: string) => (r[k] as string | null | undefined) ?? '';
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setR({ ...r, [k]: e.target.value });

  const submit = async () => {
    const pick = (keys: string[]) => Object.fromEntries(keys.map((k) => [k, r[k] === '' ? undefined : r[k]]));
    const body =
      kind === 'departments'
        ? { ...pick(['name', 'code', 'description', 'costCenter']), parentId: r.parentId || null, headId: r.headId || null }
        : kind === 'designations'
          ? pick(['title', 'level', 'jobFamily', 'description'])
          : { ...pick(['name', 'code', 'address', 'city', 'country', 'timezone']), isHeadquarters: !!r.isHeadquarters };
    await save.mutateAsync({ id: r.id, ...body });
    toast.success('Saved');
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={`${r.id ? 'Edit' : 'New'} ${kind.slice(0, -1)}`} footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button loading={save.isPending} onClick={submit}>Save</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        {kind === 'departments' && (
          <>
            <Field label="Name" required><Input value={str('name')} onChange={set('name')} /></Field>
            <Field label="Code" required><Input value={str('code')} onChange={set('code')} /></Field>
            <Field label="Cost center"><Input value={str('costCenter')} onChange={set('costCenter')} /></Field>
            <Field label="Parent department"><Select placeholder="None" value={str('parentId')} onChange={set('parentId')} options={departments.filter((d) => d.id !== r.id).map((d) => ({ value: d.id, label: d.name }))} /></Field>
            <Field label="Department head" className="sm:col-span-2"><EmployeePicker value={str('headId') || null} initialLabel={(r.head as { fullName?: string } | null)?.fullName} onChange={(e) => setR({ ...r, headId: e?.id ?? '' })} /></Field>
            <Field label="Description" className="sm:col-span-2"><Textarea rows={2} value={str('description')} onChange={set('description')} /></Field>
          </>
        )}
        {kind === 'designations' && (
          <>
            <Field label="Title" required className="sm:col-span-2"><Input value={str('title')} onChange={set('title')} /></Field>
            <Field label="Level" required hint="e.g. L1 (entry) – L9 (executive)"><Input value={str('level')} onChange={set('level')} /></Field>
            <Field label="Job family"><Input value={str('jobFamily')} onChange={set('jobFamily')} /></Field>
            <Field label="Description" className="sm:col-span-2"><Textarea rows={2} value={str('description')} onChange={set('description')} /></Field>
          </>
        )}
        {kind === 'locations' && (
          <>
            <Field label="Name" required><Input value={str('name')} onChange={set('name')} /></Field>
            <Field label="Code" required><Input value={str('code')} onChange={set('code')} /></Field>
            <Field label="City" required><Input value={str('city')} onChange={set('city')} /></Field>
            <Field label="Country" required><Input value={str('country')} onChange={set('country')} /></Field>
            <Field label="Timezone"><Input value={str('timezone')} onChange={set('timezone')} placeholder="Europe/London" /></Field>
            <Field label="Address"><Input value={str('address')} onChange={set('address')} /></Field>
            <Checkbox label="Headquarters" checked={!!r.isHeadquarters} onChange={(e) => setR({ ...r, isHeadquarters: e.target.checked })} />
          </>
        )}
      </div>
    </Modal>
  );
}

export function OrganizationPage() {
  const [tab, setTab] = useState<Kind>('departments');
  const { data: departments = [] } = useDepartments();
  const { data: designations = [] } = useDesignations();
  const { data: locations = [] } = useLocations();
  const remove = useDeleteOrgItem(tab);
  const [editing, setEditing] = useState<Row | null>(null);
  const [deleting, setDeleting] = useState<Row | null>(null);

  const actions = (row: Row) => (
    <TD className="text-right whitespace-nowrap">
      <Button size="icon-sm" variant="ghost" onClick={() => setEditing(row)} aria-label="Edit"><Pencil className="h-3.5 w-3.5" /></Button>
      <Button size="icon-sm" variant="ghost" onClick={() => setDeleting(row)} aria-label="Delete"><Trash2 className="h-3.5 w-3.5" /></Button>
    </TD>
  );

  return (
    <>
      <PageHeader title="Organization" description="Structure that powers reporting lines, approvals, payroll cost centers and analytics." actions={<Button onClick={() => setEditing({})}><Plus className="h-4 w-4" /> Add {tab.slice(0, -1)}</Button>} />
      <div className="mb-6 grid grid-cols-3 gap-4">
        <StatCard label="Departments" value={departments.length} icon={Building2} />
        <StatCard label="Designations" value={designations.length} tone="info" />
        <StatCard label="Locations" value={locations.length} tone="success" />
      </div>
      <Tabs className="mb-6" value={tab} onChange={(v) => setTab(v as Kind)} tabs={[{ value: 'departments', label: 'Departments' }, { value: 'designations', label: 'Designations' }, { value: 'locations', label: 'Locations' }]} />
      <Card>
        {tab === 'departments' && (
          <Table>
            <THead><tr><TH>Department</TH><TH>Code</TH><TH>Head</TH><TH>Parent</TH><TH>Cost center</TH><TH className="text-right">Headcount</TH><TH /></tr></THead>
            <TBody>{departments.map((d) => (
              <TR key={d.id}>
                <TD className="font-medium">{d.name}</TD>
                <TD className="font-mono text-xs">{d.code}</TD>
                <TD>{d.head ? <PersonCell name={d.head.fullName} subtitle={d.head.designation?.title} size="xs" /> : '—'}</TD>
                <TD className="text-muted-foreground">{d.parent?.name ?? '—'}</TD>
                <TD className="font-mono text-xs text-muted-foreground">{d.costCenter ?? '—'}</TD>
                <TD className="tabular text-right">{d.headcount}</TD>
                {actions(d as unknown as Row)}
              </TR>
            ))}</TBody>
          </Table>
        )}
        {tab === 'designations' && (
          <Table>
            <THead><tr><TH>Title</TH><TH>Level</TH><TH>Job family</TH><TH className="text-right">Headcount</TH><TH /></tr></THead>
            <TBody>{designations.map((d) => (
              <TR key={d.id}>
                <TD className="font-medium">{d.title}</TD>
                <TD><Badge variant="primary">{d.level}</Badge></TD>
                <TD className="text-muted-foreground">{d.jobFamily ?? '—'}</TD>
                <TD className="tabular text-right">{d.headcount}</TD>
                {actions(d as unknown as Row)}
              </TR>
            ))}</TBody>
          </Table>
        )}
        {tab === 'locations' && (
          <Table>
            <THead><tr><TH>Location</TH><TH>Code</TH><TH>City</TH><TH>Country</TH><TH>Timezone</TH><TH className="text-right">Headcount</TH><TH /></tr></THead>
            <TBody>{locations.map((l) => (
              <TR key={l.id}>
                <TD className="font-medium">{l.name} {l.isHeadquarters && <Badge variant="success" className="ml-1">HQ</Badge>}</TD>
                <TD className="font-mono text-xs">{l.code}</TD>
                <TD>{l.city}</TD>
                <TD>{l.country}</TD>
                <TD className="font-mono text-xs text-muted-foreground">{l.timezone}</TD>
                <TD className="tabular text-right">{l.headcount}</TD>
                {actions(l as unknown as Row)}
              </TR>
            ))}</TBody>
          </Table>
        )}
        {((tab === 'departments' && !departments.length) || (tab === 'designations' && !designations.length) || (tab === 'locations' && !locations.length)) && <EmptyState title="Nothing here yet" />}
      </Card>
      {editing && <Editor kind={tab} row={editing} onClose={() => setEditing(null)} />}
      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} title="Delete?" variant="danger" confirmLabel="Delete" loading={remove.isPending}
        message={`${deleting?.name ?? deleting?.title ?? ''} will be removed. Records that still reference it cannot be deleted.`}
        onConfirm={async () => { await remove.mutateAsync(deleting!.id!); toast.success('Deleted'); setDeleting(null); }} />
    </>
  );
}
