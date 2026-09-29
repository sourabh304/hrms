'use client';

import { ArrowLeft, Briefcase, Cake, Mail, MapPin, Network, Pencil, Phone } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import { StatusBadge } from '@/components/ui/badge';
import { Button, LinkButton } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { Avatar, EmptyState, KeyValue, PageLoader, PersonCell } from '@/components/ui/misc';
import { Tabs } from '@/components/ui/tabs';
import { useAccess } from '@/features/auth/api';
import { PERMISSIONS } from '@/features/auth/types';
import { CompensationCard } from '@/features/payroll/components/compensation-card';
import { formatDate, humanize } from '@/lib/utils';
import { useEmployee, useUpdateEmployee } from '../api';
import type { EmployeeDetail as Detail } from '../types';
import { cleanPayload, EmployeeForm } from './employee-form';
import { EmployeeTimeline } from './employee-timeline';

export function PersonalInfo({ employee }: { employee: Detail }) {
  const a = employee.address;
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader title="Personal details" />
        <CardContent>
          <dl className="grid grid-cols-2 gap-4">
            <KeyValue label="Personal email" value={employee.personalEmail} />
            <KeyValue label="Phone" value={employee.phone} />
            <KeyValue label="Date of birth" value={employee.dateOfBirth ? formatDate(employee.dateOfBirth) : null} />
            <KeyValue label="Gender" value={humanize(employee.gender)} />
            <KeyValue label="Marital status" value={employee.maritalStatus} />
            <KeyValue label="Nationality" value={employee.nationality} />
            <KeyValue label="Blood group" value={employee.bloodGroup} />
            <KeyValue label="Address" value={a ? [a.line1, a.city, a.country, a.postalCode].filter(Boolean).join(', ') : null} />
          </dl>
        </CardContent>
      </Card>
      <div className="space-y-6">
        <Card>
          <CardHeader title="Emergency contact" />
          <CardContent>
            {employee.emergencyContact ? (
              <dl className="grid grid-cols-3 gap-4">
                <KeyValue label="Name" value={employee.emergencyContact.name} />
                <KeyValue label="Relationship" value={employee.emergencyContact.relationship} />
                <KeyValue label="Phone" value={employee.emergencyContact.phone} />
              </dl>
            ) : (
              <p className="text-sm text-muted-foreground">Not provided or restricted.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader title="Bank account" description="Used for salary and reimbursements" />
          <CardContent>
            {employee.bankDetails ? (
              <dl className="grid grid-cols-2 gap-4">
                <KeyValue label="Bank" value={employee.bankDetails.bankName} />
                <KeyValue label="Account holder" value={employee.bankDetails.accountHolder} />
                <KeyValue label="Account number" value={`•••• ${employee.bankDetails.accountNumber.slice(-4)}`} />
                <KeyValue label="Routing code" value={employee.bankDetails.routingCode} />
              </dl>
            ) : (
              <p className="text-sm text-muted-foreground">Not provided or restricted.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function EmployeeDetail({ id }: { id: string }) {
  const { data: employee, isLoading } = useEmployee(id);
  const { can, employeeId } = useAccess();
  const [tab, setTab] = useState('overview');
  const [editing, setEditing] = useState(false);
  const update = useUpdateEmployee(id);

  if (isLoading || !employee) return <PageLoader />;
  const e = employee;
  const canEdit = can(PERMISSIONS.EMPLOYEE_WRITE);
  const canSeePay = can(PERMISSIONS.PAYROLL_MANAGE) || employeeId === e.id;
  const canSeePersonal = canEdit || employeeId === e.id || e.managerId === employeeId;

  return (
    <>
      <Link href="/employees" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Employees
      </Link>

      <Card className="mb-6 overflow-hidden">
        <div className="h-20 bg-gradient-to-r from-indigo-600 via-indigo-500 to-sky-500" />
        <div className="flex flex-col gap-4 px-6 pb-5 md:flex-row md:items-end">
          <Avatar name={e.fullName} src={e.avatarUrl} size="xl" className="-mt-10 ring-4 ring-card" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold">{e.fullName}</h1>
              <StatusBadge status={e.status} />
              <span className="font-mono text-xs text-muted-foreground">{e.employeeCode}</span>
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {e.designation?.title ?? 'No designation'} · {e.department?.name ?? 'No department'}
            </p>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />{e.workEmail}</span>
              {e.phone && <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{e.phone}</span>}
              {e.location && <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{e.location.name}</span>}
              <span className="flex items-center gap-1.5"><Briefcase className="h-3.5 w-3.5" />Joined {formatDate(e.dateOfJoining)}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <LinkButton href={`/org-chart?focus=${e.id}`} variant="outline"><Network className="h-4 w-4" /> Org chart</LinkButton>
            {canEdit && (
              <Button onClick={() => setEditing(true)}>
                <Pencil className="h-4 w-4" /> Edit
              </Button>
            )}
          </div>
        </div>
        <div className="px-6">
          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[
              { value: 'overview', label: 'Overview' },
              { value: 'personal', label: 'Personal', hidden: !canSeePersonal },
              { value: 'timeline', label: 'Job history' },
              { value: 'compensation', label: 'Compensation', hidden: !canSeePay },
            ]}
          />
        </div>
      </Card>

      {tab === 'overview' && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Card>
              <CardHeader title="Employment" />
              <CardContent>
                <dl className="grid grid-cols-2 gap-5 md:grid-cols-3">
                  <KeyValue label="Designation" value={e.designation ? `${e.designation.title} · ${e.designation.level}` : null} />
                  <KeyValue label="Department" value={e.department?.name} />
                  <KeyValue label="Location" value={e.location ? `${e.location.city}, ${e.location.country}` : null} />
                  <KeyValue label="Employment type" value={humanize(e.employmentType)} />
                  <KeyValue label="Work mode" value={humanize(e.workMode)} />
                  <KeyValue label="Probation ends" value={formatDate(e.probationEndDate)} />
                  <KeyValue label="Date of joining" value={formatDate(e.dateOfJoining)} />
                  {e.dateOfExit && <KeyValue label="Date of exit" value={formatDate(e.dateOfExit)} />}
                  {e.account && <KeyValue label="System roles" value={e.account.roles.map(humanize).join(', ')} />}
                </dl>
              </CardContent>
            </Card>
            <Card>
              <CardHeader title="About" />
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{e.bio || 'No bio added yet.'}</p>
                {!!e.skills?.length && (
                  <div className="flex flex-wrap gap-1.5">
                    {e.skills.map((s) => (
                      <span key={s} className="rounded-full bg-primary-soft px-2.5 py-1 text-xs text-primary-soft-foreground">{s}</span>
                    ))}
                  </div>
                )}
                {e.dateOfBirth && (
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Cake className="h-3.5 w-3.5" /> Birthday {formatDate(e.dateOfBirth, 'MMMM d')}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
          <div className="space-y-6">
            <Card>
              <CardHeader title="Reports to" />
              <CardContent>
                {e.manager ? (
                  <Link href={`/employees/${e.manager.id}`} className="block rounded-lg p-1 hover:bg-muted">
                    <PersonCell name={e.manager.fullName} src={e.manager.avatarUrl} subtitle={e.manager.designation?.title} />
                  </Link>
                ) : (
                  <p className="text-sm text-muted-foreground">Top of the organization</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader title={`Direct reports (${e.directReports.length})`} />
              {e.directReports.length ? (
                <ul className="space-y-1 p-3">
                  {e.directReports.map((r) => (
                    <li key={r.id}>
                      <Link href={`/employees/${r.id}`} className="block rounded-lg p-2 hover:bg-muted">
                        <PersonCell name={r.fullName} src={r.avatarUrl} subtitle={r.designation?.title} />
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState title="No direct reports" className="py-8" />
              )}
            </Card>
          </div>
        </div>
      )}
      {tab === 'personal' && <PersonalInfo employee={e} />}
      {tab === 'timeline' && <EmployeeTimeline employeeId={e.id} />}
      {tab === 'compensation' && <CompensationCard employeeId={e.id} />}

      <Modal open={editing} onClose={() => setEditing(false)} title={`Edit ${e.fullName}`} size="xl">
        <EmployeeForm
          employee={e}
          submitting={update.isPending}
          onCancel={() => setEditing(false)}
          onSubmit={async (values) => {
            const payload = cleanPayload(values);
            delete payload.createUserAccount;
            delete payload.roles;
            for (const k of ['departmentId', 'designationId', 'locationId', 'managerId'] as const) if (!values[k]) payload[k] = null;
            await update.mutateAsync(payload);
            toast.success('Employee updated');
            setEditing(false);
          }}
        />
      </Modal>
    </>
  );
}
