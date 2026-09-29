'use client';

import { KeyRound, Laptop, Pencil } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Field, Input, Textarea } from '@/components/ui/form-controls';
import { Modal } from '@/components/ui/modal';
import { Avatar, EmptyState, KeyValue, PageLoader } from '@/components/ui/misc';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { Tabs } from '@/components/ui/tabs';
import { useMyAssets } from '@/features/assets/api';
import { useChangePassword } from '@/features/auth/api';
import { useMyProfile, useUpdateMyProfile } from '@/features/employees/api';
import { PersonalInfo } from '@/features/employees/components/employee-detail';
import { EmployeeTimeline } from '@/features/employees/components/employee-timeline';
import type { EmployeeDetail } from '@/features/employees/types';
import { CompensationCard } from '@/features/payroll/components/compensation-card';
import { formatDate, humanize } from '@/lib/utils';

function EditPersonalModal({ employee, open, onClose }: { employee: EmployeeDetail; open: boolean; onClose: () => void }) {
  const update = useUpdateMyProfile();
  const [f, setF] = useState({
    preferredName: employee.preferredName ?? '',
    personalEmail: employee.personalEmail ?? '',
    phone: employee.phone ?? '',
    bio: employee.bio ?? '',
    skills: (employee.skills ?? []).join(', '),
    line1: employee.address?.line1 ?? '',
    city: employee.address?.city ?? '',
    country: employee.address?.country ?? '',
    postalCode: employee.address?.postalCode ?? '',
    ecName: employee.emergencyContact?.name ?? '',
    ecRelationship: employee.emergencyContact?.relationship ?? '',
    ecPhone: employee.emergencyContact?.phone ?? '',
    bankName: employee.bankDetails?.bankName ?? '',
    accountHolder: employee.bankDetails?.accountHolder ?? '',
    accountNumber: employee.bankDetails?.accountNumber ?? '',
    routingCode: employee.bankDetails?.routingCode ?? '',
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  const save = async () => {
    await update.mutateAsync({
      preferredName: f.preferredName || undefined,
      personalEmail: f.personalEmail || undefined,
      phone: f.phone || undefined,
      bio: f.bio,
      skills: f.skills.split(',').map((s) => s.trim()).filter(Boolean),
      address: { line1: f.line1, city: f.city, country: f.country, postalCode: f.postalCode },
      ...(f.ecName ? { emergencyContact: { name: f.ecName, relationship: f.ecRelationship, phone: f.ecPhone } } : {}),
      ...(f.bankName && f.accountNumber ? { bankDetails: { bankName: f.bankName, accountHolder: f.accountHolder, accountNumber: f.accountNumber, routingCode: f.routingCode || undefined } } : {}),
    });
    toast.success('Profile updated');
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Edit my details" description="Job details are maintained by HR." size="xl" footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={save} loading={update.isPending}>Save changes</Button></>}>
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Preferred name"><Input value={f.preferredName} onChange={set('preferredName')} /></Field>
          <Field label="Personal email"><Input type="email" value={f.personalEmail} onChange={set('personalEmail')} /></Field>
          <Field label="Phone"><Input value={f.phone} onChange={set('phone')} /></Field>
          <Field label="Bio" className="sm:col-span-3"><Textarea rows={2} value={f.bio} onChange={set('bio')} /></Field>
          <Field label="Skills" hint="Comma separated" className="sm:col-span-3"><Input value={f.skills} onChange={set('skills')} /></Field>
        </div>
        <div>
          <p className="mb-3 text-sm font-semibold">Address</p>
          <div className="grid gap-4 sm:grid-cols-4">
            <Field label="Street" className="sm:col-span-2"><Input value={f.line1} onChange={set('line1')} /></Field>
            <Field label="City"><Input value={f.city} onChange={set('city')} /></Field>
            <Field label="Postal code"><Input value={f.postalCode} onChange={set('postalCode')} /></Field>
            <Field label="Country" className="sm:col-span-2"><Input value={f.country} onChange={set('country')} /></Field>
          </div>
        </div>
        <div>
          <p className="mb-3 text-sm font-semibold">Emergency contact</p>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Name"><Input value={f.ecName} onChange={set('ecName')} /></Field>
            <Field label="Relationship"><Input value={f.ecRelationship} onChange={set('ecRelationship')} /></Field>
            <Field label="Phone"><Input value={f.ecPhone} onChange={set('ecPhone')} /></Field>
          </div>
        </div>
        <div>
          <p className="mb-3 text-sm font-semibold">Bank account (for salary)</p>
          <div className="grid gap-4 sm:grid-cols-4">
            <Field label="Bank"><Input value={f.bankName} onChange={set('bankName')} /></Field>
            <Field label="Account holder"><Input value={f.accountHolder} onChange={set('accountHolder')} /></Field>
            <Field label="Account number"><Input value={f.accountNumber} onChange={set('accountNumber')} /></Field>
            <Field label="Routing code"><Input value={f.routingCode} onChange={set('routingCode')} /></Field>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function SecurityCard() {
  const change = useChangePassword();
  const [f, setF] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  return (
    <Card className="max-w-xl">
      <CardHeader title="Change password" description="At least 8 characters with upper-case, lower-case and a number." />
      <CardContent className="space-y-4">
        <Field label="Current password"><Input type="password" autoComplete="current-password" value={f.currentPassword} onChange={(e) => setF({ ...f, currentPassword: e.target.value })} /></Field>
        <Field label="New password"><Input type="password" autoComplete="new-password" value={f.newPassword} onChange={(e) => setF({ ...f, newPassword: e.target.value })} /></Field>
        <Field label="Confirm new password" error={f.confirm && f.confirm !== f.newPassword ? 'Passwords do not match' : undefined}>
          <Input type="password" autoComplete="new-password" value={f.confirm} onChange={(e) => setF({ ...f, confirm: e.target.value })} />
        </Field>
        <Button
          loading={change.isPending}
          disabled={!f.currentPassword || !f.newPassword || f.newPassword !== f.confirm}
          onClick={async () => {
            await change.mutateAsync({ currentPassword: f.currentPassword, newPassword: f.newPassword });
            toast.success('Password changed');
            setF({ currentPassword: '', newPassword: '', confirm: '' });
          }}
        >
          <KeyRound className="h-4 w-4" /> Update password
        </Button>
      </CardContent>
    </Card>
  );
}

function MyAssets() {
  const { data = [] } = useMyAssets();
  return (
    <Card>
      <CardHeader title="Assets in my custody" description="Contact IT via the Helpdesk to report issues or request returns." />
      <Table>
        <THead><tr><TH>Asset</TH><TH>Tag</TH><TH>Serial</TH><TH>Assigned</TH><TH>Condition</TH></tr></THead>
        <TBody>
          {data.map((a) => (
            <TR key={a.id}>
              <TD className="font-medium">{a.name}</TD>
              <TD className="font-mono text-xs">{a.assetTag}</TD>
              <TD className="font-mono text-xs text-muted-foreground">{a.serialNumber}</TD>
              <TD>{formatDate(a.assignedAt)}</TD>
              <TD>{humanize(a.condition)}</TD>
            </TR>
          ))}
        </TBody>
      </Table>
      {!data.length && <EmptyState icon={Laptop} title="No assets assigned to you" />}
    </Card>
  );
}

export function ProfilePage() {
  const params = useSearchParams();
  const { data: me, isLoading } = useMyProfile();
  const [tab, setTab] = useState(params.get('tab') ?? 'overview');
  const [editing, setEditing] = useState(false);
  if (isLoading || !me) return <PageLoader />;

  return (
    <>
      <Card className="mb-6 overflow-hidden">
        <div className="h-20 bg-gradient-to-r from-indigo-600 via-violet-500 to-sky-500" />
        <div className="flex flex-col gap-4 px-6 pb-5 md:flex-row md:items-end">
          <Avatar name={me.fullName} src={me.avatarUrl} size="xl" className="-mt-10 ring-4 ring-card" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold">{me.fullName}</h1>
              <StatusBadge status={me.status} />
            </div>
            <p className="text-sm text-muted-foreground">{me.designation?.title} · {me.department?.name} · {me.location?.name}</p>
          </div>
          <Button onClick={() => setEditing(true)}><Pencil className="h-4 w-4" /> Edit my details</Button>
        </div>
        <div className="px-6">
          <Tabs value={tab} onChange={setTab} tabs={[
            { value: 'overview', label: 'Overview' },
            { value: 'personal', label: 'Personal & bank' },
            { value: 'compensation', label: 'Compensation' },
            { value: 'timeline', label: 'Job history' },
            { value: 'assets', label: 'My assets' },
            { value: 'security', label: 'Security' },
          ]} />
        </div>
      </Card>

      {tab === 'overview' && (
        <Card>
          <CardHeader title="Employment" />
          <CardContent>
            <dl className="grid grid-cols-2 gap-5 md:grid-cols-4">
              <KeyValue label="Employee code" value={me.employeeCode} />
              <KeyValue label="Work email" value={me.workEmail} />
              <KeyValue label="Manager" value={me.manager?.fullName ?? '—'} />
              <KeyValue label="Date of joining" value={formatDate(me.dateOfJoining)} />
              <KeyValue label="Employment type" value={humanize(me.employmentType)} />
              <KeyValue label="Work mode" value={humanize(me.workMode)} />
              <KeyValue label="Level" value={me.designation?.level} />
              <KeyValue label="Direct reports" value={me.directReports.length} />
            </dl>
            {!!me.skills?.length && (
              <div className="mt-6 flex flex-wrap gap-1.5">
                {me.skills.map((s) => <span key={s} className="rounded-full bg-primary-soft px-2.5 py-1 text-xs text-primary-soft-foreground">{s}</span>)}
              </div>
            )}
          </CardContent>
        </Card>
      )}
      {tab === 'personal' && <PersonalInfo employee={me} />}
      {tab === 'compensation' && <CompensationCard employeeId={me.id} />}
      {tab === 'timeline' && <EmployeeTimeline employeeId={me.id} />}
      {tab === 'assets' && <MyAssets />}
      {tab === 'security' && <SecurityCard />}
      {editing && <EditPersonalModal employee={me} open={editing} onClose={() => setEditing(false)} />}
    </>
  );
}
