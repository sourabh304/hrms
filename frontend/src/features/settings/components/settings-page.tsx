'use client';

import { ArrowDown, Check, Copy, GitBranch, KeyRound, Plus, Search, ShieldCheck, Trash2, UserCog } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Checkbox, Field, Input, Select } from '@/components/ui/form-controls';
import { Modal } from '@/components/ui/modal';
import { EmptyState, PageHeader, PersonCell, Skeleton } from '@/components/ui/misc';
import { Pagination, Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { Tabs } from '@/components/ui/tabs';
import { useAccess } from '@/features/auth/api';
import { PERMISSIONS, ROLES, type Role } from '@/features/auth/types';
import { useSettings, useUpdateSettings, type CompanySettings } from '@/features/organization/api';
import { usePolicies, useUpdatePolicy } from '@/features/workflow/api';
import { WORKFLOW_LABELS, type PolicyStep, type WorkflowPolicy } from '@/features/workflow/types';
import { MONTHS } from '@/lib/options';
import { humanize, timeAgo } from '@/lib/utils';
import { useResetPassword, useRoleMatrix, useSetUserStatus, useUpdateRoles, useUsers, type UserAccount } from '../api';

function RolesModal({ user, onClose }: { user: UserAccount; onClose: () => void }) {
  const update = useUpdateRoles();
  const [roles, setRoles] = useState<Role[]>(user.roles);
  return (
    <Modal open onClose={onClose} title={`Roles — ${user.employee?.fullName ?? user.email}`} description="Permissions are the union of all assigned roles."
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button loading={update.isPending} onClick={async () => { await update.mutateAsync({ id: user.id, roles }); toast.success('Roles updated'); onClose(); }}>Save</Button></>}>
      <div className="grid grid-cols-2 gap-2">
        {ROLES.map((r) => (
          <Checkbox key={r} className="rounded-lg border border-border px-3 py-2" label={humanize(r)} checked={roles.includes(r)} disabled={r === 'EMPLOYEE'}
            onChange={(e) => setRoles(e.target.checked ? [...roles, r] : roles.filter((x) => x !== r))} />
        ))}
      </div>
    </Modal>
  );
}

function UsersTab() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const { data, isLoading } = useUsers({ page, search: search || undefined, role: role || undefined });
  const setStatus = useSetUserStatus();
  const reset = useResetPassword();
  const { user: me } = useAccess();
  const [editing, setEditing] = useState<UserAccount | null>(null);
  const [temp, setTemp] = useState<{ email: string; password: string } | null>(null);

  return (
    <Card>
      <div className="flex flex-wrap gap-3 border-b border-border p-3">
        <div className="relative w-64"><Search className="absolute top-2.5 left-3 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Search users" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} /></div>
        <Select className="w-48" placeholder="All roles" value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }} options={ROLES.map((r) => ({ value: r, label: humanize(r) }))} />
      </div>
      <Table>
        <THead><tr><TH>User</TH><TH>Roles</TH><TH>Last sign-in</TH><TH>Status</TH><TH /></tr></THead>
        <TBody>
          {isLoading && <tr><TD colSpan={5}><Skeleton className="h-24" /></TD></tr>}
          {data?.data.map((u) => (
            <TR key={u.id}>
              <TD><PersonCell name={u.employee?.fullName ?? u.email} src={u.employee?.avatarUrl} subtitle={u.email} /></TD>
              <TD><div className="flex flex-wrap gap-1">{u.roles.filter((r) => r !== 'EMPLOYEE').map((r) => <Badge key={r} variant="primary">{humanize(r)}</Badge>)}{u.roles.length === 1 && <Badge>Employee</Badge>}</div></TD>
              <TD className="text-muted-foreground">{u.lastLoginAt ? timeAgo(u.lastLoginAt) : 'Never'}</TD>
              <TD><StatusBadge status={u.isActive ? 'ACTIVE' : 'CLOSED'} label={u.isActive ? 'Active' : 'Deactivated'} /></TD>
              <TD className="text-right whitespace-nowrap">
                <Button size="sm" variant="ghost" onClick={() => setEditing(u)}><UserCog className="h-3.5 w-3.5" /> Roles</Button>
                <Button size="sm" variant="ghost" onClick={async () => { const r = await reset.mutateAsync(u.id); setTemp({ email: u.email, password: r.temporaryPassword }); }}><KeyRound className="h-3.5 w-3.5" /> Reset</Button>
                {u.id !== me?.id && <Button size="sm" variant="ghost" className={u.isActive ? 'text-danger' : ''} onClick={async () => { await setStatus.mutateAsync({ id: u.id, isActive: !u.isActive }); toast.success(u.isActive ? 'User deactivated' : 'User reactivated'); }}>{u.isActive ? 'Deactivate' : 'Activate'}</Button>}
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
      {data && <Pagination page={page} totalPages={data.meta.totalPages} total={data.meta.total} onPage={setPage} />}
      {editing && <RolesModal user={editing} onClose={() => setEditing(null)} />}
      <Modal open={!!temp} onClose={() => setTemp(null)} title="Temporary password" description={`Share securely with ${temp?.email}. They must change it at next sign-in.`}>
        <div className="flex items-center justify-between rounded-lg bg-muted px-4 py-3 font-mono text-sm">
          {temp?.password}
          <Button size="icon-sm" variant="ghost" aria-label="Copy" onClick={() => { navigator.clipboard.writeText(temp?.password ?? ''); toast.success('Copied'); }}><Copy className="h-4 w-4" /></Button>
        </div>
      </Modal>
    </Card>
  );
}

function RoleMatrix() {
  const { data = [] } = useRoleMatrix();
  const perms = Object.values(PERMISSIONS);
  return (
    <Card>
      <CardHeader title="Role permission matrix" description="Every employee also has self-service access; manager access is derived from the reporting line." />
      <Table className="text-xs">
        <THead><tr><TH>Permission</TH>{data.map((r) => <TH key={r.role} className="text-center">{humanize(r.role)}</TH>)}</tr></THead>
        <TBody>
          {perms.map((p) => (
            <TR key={p}>
              <TD className="font-mono">{p}</TD>
              {data.map((r) => <TD key={r.role} className="text-center">{r.permissions.includes(p) ? <Check className="mx-auto h-4 w-4 text-success" aria-label="granted" /> : <span className="text-muted-foreground/40">—</span>}</TD>)}
            </TR>
          ))}
        </TBody>
      </Table>
    </Card>
  );
}

const CONDITION_FIELDS: Record<string, string[]> = { LEAVE: ['days'], EXPENSE: ['amount'], ATTENDANCE_REGULARIZATION: [], SEPARATION: [], JOB_REQUISITION: ['openings'] };

function PolicyEditor({ policy }: { policy: WorkflowPolicy }) {
  const update = useUpdatePolicy();
  const [steps, setSteps] = useState<PolicyStep[]>(policy.steps);
  const [active, setActive] = useState(policy.isActive);
  const dirty = JSON.stringify(steps) !== JSON.stringify(policy.steps) || active !== policy.isActive;
  const setStep = (i: number, patch: Partial<PolicyStep>) => setSteps(steps.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const fields = CONDITION_FIELDS[policy.type] ?? [];

  return (
    <Card>
      <CardHeader title={<span className="flex items-center gap-2"><GitBranch className="h-4 w-4 text-primary" />{policy.name}</span>} description={policy.description} action={<Checkbox label="Active" checked={active} onChange={(e) => setActive(e.target.checked)} />} />
      <CardContent className="space-y-2">
        <div className="rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">Employee submits {WORKFLOW_LABELS[policy.type].toLowerCase()} request</div>
        {steps.map((s, i) => (
          <div key={i}>
            <ArrowDown className="mx-auto my-1 h-3.5 w-3.5 text-muted-foreground" />
            <div className="grid gap-2 rounded-lg border border-border bg-muted/40 p-3 md:grid-cols-[1.2fr_1fr_1fr_1.4fr_32px]">
              <Input value={s.label} onChange={(e) => setStep(i, { label: e.target.value })} aria-label="Step label" />
              <Select value={s.approverType} onChange={(e) => setStep(i, { approverType: e.target.value as PolicyStep['approverType'], role: e.target.value === 'ROLE' ? (s.role ?? 'HR_ADMIN') : undefined })}
                options={[{ value: 'MANAGER', label: 'Reporting manager' }, { value: 'SKIP_LEVEL_MANAGER', label: "Manager's manager" }, { value: 'DEPARTMENT_HEAD', label: 'Department head' }, { value: 'ROLE', label: 'Anyone with role' }]} />
              {s.approverType === 'ROLE' ? <Select value={s.role} onChange={(e) => setStep(i, { role: e.target.value })} options={ROLES.filter((r) => r !== 'EMPLOYEE').map((r) => ({ value: r, label: humanize(r) }))} /> : <div />}
              {fields.length ? (
                <div className="flex items-center gap-1.5">
                  <Checkbox label="Only if" checked={!!s.condition} onChange={(e) => setStep(i, { condition: e.target.checked ? { field: fields[0], operator: 'gt', value: 0 } : undefined })} />
                  {s.condition && (
                    <>
                      <Select className="w-24" value={s.condition.field} onChange={(e) => setStep(i, { condition: { ...s.condition!, field: e.target.value } })} options={fields.map((f) => ({ value: f, label: f }))} />
                      <Select className="w-16" value={s.condition.operator} onChange={(e) => setStep(i, { condition: { ...s.condition!, operator: e.target.value as 'gt' } })} options={[{ value: 'gt', label: '>' }, { value: 'gte', label: '≥' }, { value: 'lt', label: '<' }, { value: 'lte', label: '≤' }]} />
                      <Input className="w-20" type="number" value={s.condition.value} onChange={(e) => setStep(i, { condition: { ...s.condition!, value: Number(e.target.value) } })} />
                    </>
                  )}
                </div>
              ) : <div />}
              <Button variant="ghost" size="icon-sm" onClick={() => setSteps(steps.filter((_, j) => j !== i))} aria-label="Remove step"><Trash2 className="h-3.5 w-3.5" /></Button>
            </div>
          </div>
        ))}
        <ArrowDown className="mx-auto my-1 h-3.5 w-3.5 text-muted-foreground" />
        <div className="rounded-lg border border-dashed border-success/40 bg-success-soft/40 px-3 py-2 text-xs text-success">Approved → record updated automatically</div>
      </CardContent>
      <CardFooter className="justify-between">
        <Button variant="outline" size="sm" onClick={() => setSteps([...steps, { label: 'HR approval', approverType: 'ROLE', role: 'HR_ADMIN' }])}><Plus className="h-3.5 w-3.5" /> Add step</Button>
        <Button size="sm" disabled={!dirty} loading={update.isPending} onClick={async () => { await update.mutateAsync({ type: policy.type, steps, isActive: active }); toast.success('Workflow updated — applies to new requests'); }}>Save changes</Button>
      </CardFooter>
    </Card>
  );
}

function WorkflowsTab() {
  const { data = [], isLoading } = usePolicies();
  if (isLoading) return <Skeleton className="h-64" />;
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Configure the approval chain for each business process. Steps whose approver can&apos;t be resolved (e.g. no manager) or who is the requester are skipped automatically; a chain with no approvers auto-approves.</p>
      <div className="grid gap-4 xl:grid-cols-2">{data.map((p) => <PolicyEditor key={p.id} policy={p} />)}</div>
      {!data.length && <EmptyState title="No workflow policies" />}
    </div>
  );
}

function CompanyTab() {
  const { data } = useSettings();
  if (!data) return <Skeleton className="h-64" />;
  return <CompanyForm initial={data} />;
}

function CompanyForm({ initial }: { initial: CompanySettings }) {
  const update = useUpdateSettings();
  const [s, setS] = useState<CompanySettings>(initial);
  const set = <K extends keyof CompanySettings>(k: K, v: CompanySettings[K]) => setS({ ...s, [k]: v });
  const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card>
        <CardHeader title="Company profile" />
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Company name"><Input value={s.companyName} onChange={(e) => set('companyName', e.target.value)} /></Field>
          <Field label="Legal name"><Input value={s.legalName ?? ''} onChange={(e) => set('legalName', e.target.value)} /></Field>
          <Field label="Website"><Input value={s.website ?? ''} onChange={(e) => set('website', e.target.value)} /></Field>
          <Field label="Email domain" hint="Used to generate work emails for new hires"><Input value={s.emailDomain} onChange={(e) => set('emailDomain', e.target.value)} /></Field>
          <Field label="Employee code prefix"><Input value={s.employeeCodePrefix} onChange={(e) => set('employeeCodePrefix', e.target.value)} /></Field>
          <Field label="Currency" hint="ISO 4217 code"><Input maxLength={3} value={s.currency} onChange={(e) => set('currency', e.target.value.toUpperCase())} /></Field>
          <Field label="Timezone"><Input value={s.timezone} onChange={(e) => set('timezone', e.target.value)} /></Field>
          <Field label="Fiscal year starts"><Select value={String(s.fiscalYearStartMonth)} onChange={(e) => set('fiscalYearStartMonth', Number(e.target.value))} options={MONTHS.map((m, i) => ({ value: String(i + 1), label: m }))} /></Field>
        </CardContent>
      </Card>
      <Card>
        <CardHeader title="Work policies" />
        <CardContent className="space-y-4">
          <div>
            <p className="mb-2 text-xs font-medium">Weekly off days</p>
            <div className="flex flex-wrap gap-2">
              {days.map((d) => (
                <button key={d} type="button" onClick={() => set('weeklyOffs', s.weeklyOffs.includes(d) ? s.weeklyOffs.filter((x) => x !== d) : [...s.weeklyOffs, d])}
                  className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-medium ${s.weeklyOffs.includes(d) ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:bg-muted'}`}>{d}</button>
              ))}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Standard hours / day"><Input type="number" value={s.standardWorkHours} onChange={(e) => set('standardWorkHours', Number(e.target.value))} /></Field>
            <Field label="Probation (days)"><Input type="number" value={s.probationDays} onChange={(e) => set('probationDays', Number(e.target.value))} /></Field>
            <Field label="Notice period (days)"><Input type="number" value={s.noticePeriodDays} onChange={(e) => set('noticePeriodDays', Number(e.target.value))} /></Field>
          </div>
          <div>
            <p className="mb-2 text-xs font-medium">Income tax slabs (annual, {s.currency})</p>
            <div className="space-y-2">
              {s.taxSlabs.map((t, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_90px_32px] items-center gap-2">
                  <Input type="number" value={t.from} onChange={(e) => set('taxSlabs', s.taxSlabs.map((x, j) => (j === i ? { ...x, from: Number(e.target.value) } : x)))} aria-label="From" />
                  <Input type="number" placeholder="No limit" value={t.to ?? ''} onChange={(e) => set('taxSlabs', s.taxSlabs.map((x, j) => (j === i ? { ...x, to: e.target.value === '' ? null : Number(e.target.value) } : x)))} aria-label="To" />
                  <Input type="number" value={t.ratePercent} onChange={(e) => set('taxSlabs', s.taxSlabs.map((x, j) => (j === i ? { ...x, ratePercent: Number(e.target.value) } : x)))} aria-label="Rate %" />
                  <Button variant="ghost" size="icon-sm" onClick={() => set('taxSlabs', s.taxSlabs.filter((_, j) => j !== i))} aria-label="Remove slab"><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => set('taxSlabs', [...s.taxSlabs, { from: 0, to: null, ratePercent: 0 }])}><Plus className="h-3.5 w-3.5" /> Add slab</Button>
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="xl:col-span-2 flex justify-end">
        <Button loading={update.isPending} onClick={async () => {
          const editable: (keyof CompanySettings)[] = [
            'companyName', 'legalName', 'website', 'currency', 'timezone', 'dateFormat', 'fiscalYearStartMonth', 'weeklyOffs',
            'standardWorkHours', 'probationDays', 'noticePeriodDays', 'employeeCodePrefix', 'emailDomain', 'taxSlabs',
          ];
          await update.mutateAsync(Object.fromEntries(editable.map((k) => [k, s[k] ?? undefined])));
          toast.success('Company settings saved');
        }}>Save settings</Button>
      </div>
    </div>
  );
}

export function SettingsPage() {
  const { can } = useAccess();
  const tabs = [
    { value: 'users', label: 'Users & access', hidden: !can(PERMISSIONS.USER_MANAGE) },
    { value: 'roles', label: 'Role matrix', hidden: !can(PERMISSIONS.USER_MANAGE) },
    { value: 'workflows', label: 'Approval workflows', hidden: !can(PERMISSIONS.WORKFLOW_MANAGE) },
    { value: 'company', label: 'Company', hidden: !can(PERMISSIONS.ORG_MANAGE) },
  ];
  const [tab, setTab] = useState(tabs.find((t) => !t.hidden)?.value ?? 'company');
  return (
    <>
      <PageHeader title="Settings" description="Administer access, business processes and company-wide configuration." actions={<Badge variant="primary"><ShieldCheck className="h-3 w-3" /> Changes are audited</Badge>} />
      <Tabs className="mb-6" value={tab} onChange={setTab} tabs={tabs} />
      {tab === 'users' && <UsersTab />}
      {tab === 'roles' && <RoleMatrix />}
      {tab === 'workflows' && <WorkflowsTab />}
      {tab === 'company' && <CompanyTab />}
    </>
  );
}
