'use client';

import { Laptop, PackageCheck, Plus, Search, Undo2, UserPlus, Wrench } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { BarList } from '@/components/charts';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Field, Input, Select, Textarea } from '@/components/ui/form-controls';
import { Modal } from '@/components/ui/modal';
import { EmptyState, PageHeader, PageLoader, PersonCell, Skeleton, StatCard } from '@/components/ui/misc';
import { Pagination, Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { useAccess } from '@/features/auth/api';
import { PERMISSIONS } from '@/features/auth/types';
import { EmployeePicker } from '@/features/employees/components/employee-picker';
import { useCurrency } from '@/features/organization/api';
import { enumOptions } from '@/lib/options';
import { formatDate, formatMoney, humanize } from '@/lib/utils';
import { ASSET_CATEGORIES, ASSET_CONDITIONS, useAsset, useAssets, useAssetStats, useAssignAsset, useMyAssets, useReturnAsset, useSaveAsset, type Asset } from '../api';

function AssetDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const { data: a, isLoading } = useAsset(id);
  const assign = useAssignAsset();
  const ret = useReturnAsset();
  const currency = useCurrency();
  const [employeeId, setEmployeeId] = useState('');
  const [condition, setCondition] = useState('GOOD');
  return (
    <Modal open onClose={onClose} title={a ? `${a.name} · ${a.assetTag}` : 'Asset'} size="lg">
      {isLoading || !a ? <PageLoader /> : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
            {[['Category', humanize(a.category)], ['Brand / model', [a.brand, a.model].filter(Boolean).join(' ') || '—'], ['Serial', a.serialNumber], ['Purchased', formatDate(a.purchaseDate)], ['Cost', formatMoney(a.purchaseCost, currency)], ['Warranty until', formatDate(a.warrantyUntil)], ['Condition', humanize(a.condition)]].map(([k, v]) => (
              <div key={k}><p className="text-xs text-muted-foreground">{k}</p><p className="font-medium">{v ?? '—'}</p></div>
            ))}
            <div><p className="text-xs text-muted-foreground">Status</p><StatusBadge status={a.status} /></div>
          </div>
          {a.status === 'AVAILABLE' && (
            <div className="flex items-end gap-2 rounded-lg bg-muted p-3">
              <Field label="Assign to" className="flex-1"><EmployeePicker onChange={(e) => setEmployeeId(e?.id ?? '')} /></Field>
              <Button disabled={!employeeId} loading={assign.isPending} onClick={async () => { await assign.mutateAsync({ id: a.id, employeeId }); toast.success('Asset assigned'); }}><UserPlus className="h-4 w-4" /> Assign</Button>
            </div>
          )}
          {a.status === 'ASSIGNED' && (
            <div className="flex items-end gap-2 rounded-lg bg-muted p-3">
              <div className="flex-1"><p className="text-xs text-muted-foreground">With</p><p className="text-sm font-medium">{a.assignedTo?.fullName} since {formatDate(a.assignedAt)}</p></div>
              <Field label="Condition on return"><Select value={condition} onChange={(e) => setCondition(e.target.value)} options={enumOptions(ASSET_CONDITIONS)} /></Field>
              <Button variant="outline" loading={ret.isPending} onClick={async () => { await ret.mutateAsync({ id: a.id, condition }); toast.success('Asset returned to inventory'); }}><Undo2 className="h-4 w-4" /> Return</Button>
            </div>
          )}
          <div>
            <p className="mb-2 text-sm font-semibold">Custody history</p>
            {!a.history?.length ? <p className="text-sm text-muted-foreground">Never assigned.</p> : (
              <ul className="space-y-2">
                {a.history.map((h) => (
                  <li key={h.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                    <PersonCell name={h.employee.fullName} src={h.employee.avatarUrl} size="xs" />
                    <span className="text-xs text-muted-foreground">{formatDate(h.assignedAt)} → {h.returnedAt ? `${formatDate(h.returnedAt)} (${humanize(h.conditionOnReturn)})` : 'present'}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

function NewAssetModal({ onClose }: { onClose: () => void }) {
  const save = useSaveAsset();
  const [a, setA] = useState<Partial<Asset>>({ category: 'LAPTOP', condition: 'NEW' });
  return (
    <Modal open onClose={onClose} title="Add asset" size="lg" footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button loading={save.isPending} onClick={async () => { await save.mutateAsync({ ...a, purchaseCost: a.purchaseCost ? Number(a.purchaseCost) : undefined }); toast.success('Asset added'); onClose(); }}>Save</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Asset tag" required><Input value={a.assetTag ?? ''} onChange={(e) => setA({ ...a, assetTag: e.target.value })} placeholder="SEG-LT-0100" /></Field>
        <Field label="Name" required><Input value={a.name ?? ''} onChange={(e) => setA({ ...a, name: e.target.value })} /></Field>
        <Field label="Category"><Select value={a.category} onChange={(e) => setA({ ...a, category: e.target.value as Asset['category'] })} options={enumOptions(ASSET_CATEGORIES)} /></Field>
        <Field label="Condition"><Select value={a.condition} onChange={(e) => setA({ ...a, condition: e.target.value as Asset['condition'] })} options={enumOptions(ASSET_CONDITIONS)} /></Field>
        <Field label="Brand"><Input value={a.brand ?? ''} onChange={(e) => setA({ ...a, brand: e.target.value })} /></Field>
        <Field label="Model"><Input value={a.model ?? ''} onChange={(e) => setA({ ...a, model: e.target.value })} /></Field>
        <Field label="Serial number"><Input value={a.serialNumber ?? ''} onChange={(e) => setA({ ...a, serialNumber: e.target.value })} /></Field>
        <Field label="Purchase cost"><Input type="number" value={a.purchaseCost ?? ''} onChange={(e) => setA({ ...a, purchaseCost: Number(e.target.value) })} /></Field>
        <Field label="Purchase date"><Input type="date" value={a.purchaseDate ?? ''} onChange={(e) => setA({ ...a, purchaseDate: e.target.value })} /></Field>
        <Field label="Warranty until"><Input type="date" value={a.warrantyUntil ?? ''} onChange={(e) => setA({ ...a, warrantyUntil: e.target.value })} /></Field>
        <Field label="Notes" className="sm:col-span-2"><Textarea rows={2} value={a.notes ?? ''} onChange={(e) => setA({ ...a, notes: e.target.value })} /></Field>
      </div>
    </Modal>
  );
}

function Inventory() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const { data, isLoading } = useAssets({ page, status: status || undefined, category: category || undefined, search: search || undefined });
  const { data: stats } = useAssetStats();
  const currency = useCurrency();
  const [openId, setOpenId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  return (
    <>
      <PageHeader title="Assets" description="Company hardware and licences — inventory and custody." actions={<Button onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> Add asset</Button>} />
      {stats && (
        <div className="mb-6 grid gap-4 lg:grid-cols-[repeat(3,minmax(0,1fr))_1.4fr]">
          <StatCard label="Assigned" value={stats.byStatus.ASSIGNED ?? 0} icon={Laptop} />
          <StatCard label="Available" value={stats.byStatus.AVAILABLE ?? 0} icon={PackageCheck} tone="success" />
          <StatCard label="In repair" value={stats.byStatus.IN_REPAIR ?? 0} icon={Wrench} tone="warning" hint={`Portfolio value ${formatMoney(stats.totalValue, currency, true)}`} />
          <Card><CardHeader title="By category" /><CardContent className="py-3"><BarList items={Object.entries(stats.byCategory).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, v]) => ({ name: humanize(k), value: v }))} /></CardContent></Card>
        </div>
      )}
      <Card>
        <div className="flex flex-wrap gap-3 border-b border-border p-3">
          <div className="relative w-64"><Search className="absolute top-2.5 left-3 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Tag, name, serial or person" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} /></div>
          <Select className="w-44" placeholder="All statuses" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} options={enumOptions(['AVAILABLE', 'ASSIGNED', 'IN_REPAIR', 'RETIRED', 'LOST'])} />
          <Select className="w-44" placeholder="All categories" value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} options={enumOptions(ASSET_CATEGORIES)} />
        </div>
        <Table>
          <THead><tr><TH>Asset</TH><TH>Tag</TH><TH>Category</TH><TH>Assigned to</TH><TH>Condition</TH><TH>Warranty</TH><TH>Status</TH></tr></THead>
          <TBody>
            {isLoading && <tr><TD colSpan={7}><Skeleton className="h-24" /></TD></tr>}
            {data?.data.map((a) => (
              <TR key={a.id} className="cursor-pointer" onClick={() => setOpenId(a.id)}>
                <TD className="font-medium">{a.name}</TD>
                <TD className="font-mono text-xs">{a.assetTag}</TD>
                <TD className="text-muted-foreground">{humanize(a.category)}</TD>
                <TD>{a.assignedTo ? <PersonCell name={a.assignedTo.fullName} src={a.assignedTo.avatarUrl} size="xs" /> : <span className="text-muted-foreground">—</span>}</TD>
                <TD>{humanize(a.condition)}</TD>
                <TD className="text-muted-foreground">{formatDate(a.warrantyUntil)}</TD>
                <TD><StatusBadge status={a.status} /></TD>
              </TR>
            ))}
          </TBody>
        </Table>
        {data && !data.data.length && <EmptyState icon={Laptop} title="No assets match" />}
        {data && <Pagination page={page} totalPages={data.meta.totalPages} total={data.meta.total} onPage={setPage} />}
      </Card>
      {openId && <AssetDrawer id={openId} onClose={() => setOpenId(null)} />}
      {adding && <NewAssetModal onClose={() => setAdding(false)} />}
    </>
  );
}

function MyAssetsView() {
  const { data = [], isLoading } = useMyAssets();
  return (
    <>
      <PageHeader title="My assets" description="Equipment currently in your custody. Raise a Helpdesk ticket for issues or returns." />
      {isLoading && <Skeleton className="h-40" />}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data.map((a) => (
          <Card key={a.id} className="p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-soft text-primary-soft-foreground"><Laptop className="h-5 w-5" /></div>
              <div><p className="font-semibold">{a.name}</p><p className="font-mono text-xs text-muted-foreground">{a.assetTag} · {a.serialNumber}</p></div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">Assigned {formatDate(a.assignedAt)} · condition {humanize(a.condition).toLowerCase()} · warranty until {formatDate(a.warrantyUntil)}</p>
          </Card>
        ))}
      </div>
      {!isLoading && !data.length && <Card><EmptyState icon={Laptop} title="No assets assigned to you" /></Card>}
    </>
  );
}

export function AssetsPage() {
  const { can } = useAccess();
  return can(PERMISSIONS.ASSET_MANAGE) ? <Inventory /> : <MyAssetsView />;
}
