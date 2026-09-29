'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Checkbox, Field, Input, Select, Textarea } from '@/components/ui/form-controls';
import { ROLES } from '@/features/auth/types';
import { useDepartments, useDesignations, useLocations } from '@/features/organization/api';
import { EMPLOYEE_STATUSES, EMPLOYMENT_TYPES, enumOptions, GENDERS, WORK_MODES } from '@/lib/options';
import { humanize, todayISO } from '@/lib/utils';
import type { Employee } from '../types';
import { EmployeePicker } from './employee-picker';

const optional = z.string().optional().or(z.literal(''));

const schema = z.object({
  firstName: z.string().min(1, 'Required').max(80),
  lastName: z.string().min(1, 'Required').max(80),
  preferredName: optional,
  workEmail: z.email('Enter a valid email'),
  personalEmail: z.email('Enter a valid email').optional().or(z.literal('')),
  phone: optional,
  gender: z.enum(GENDERS),
  dateOfBirth: optional,
  nationality: optional,
  departmentId: optional,
  designationId: optional,
  locationId: optional,
  managerId: optional,
  employmentType: z.enum(EMPLOYMENT_TYPES),
  workMode: z.enum(WORK_MODES),
  status: z.enum(EMPLOYEE_STATUSES),
  dateOfJoining: z.string().min(1, 'Required'),
  bio: optional,
  createUserAccount: z.boolean(),
  roles: z.array(z.string()),
  changeNote: optional,
});

export type EmployeeFormValues = z.infer<typeof schema>;

/** Drop empty strings so optional fields aren't sent as "". */
export function cleanPayload(values: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(values).filter(([, v]) => v !== '' && v !== undefined));
}

export function EmployeeForm({
  employee,
  onSubmit,
  submitting,
  onCancel,
}: {
  employee?: Employee;
  onSubmit: (values: EmployeeFormValues) => void;
  submitting?: boolean;
  onCancel?: () => void;
}) {
  const isEdit = !!employee;
  const { data: departments = [] } = useDepartments();
  const { data: designations = [] } = useDesignations();
  const { data: locations = [] } = useLocations();

  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: employee?.firstName ?? '',
      lastName: employee?.lastName ?? '',
      preferredName: employee?.preferredName ?? '',
      workEmail: employee?.workEmail ?? '',
      personalEmail: employee?.personalEmail ?? '',
      phone: employee?.phone ?? '',
      gender: employee?.gender ?? 'UNDISCLOSED',
      dateOfBirth: employee?.dateOfBirth ?? '',
      nationality: employee?.nationality ?? '',
      departmentId: employee?.departmentId ?? '',
      designationId: employee?.designationId ?? '',
      locationId: employee?.locationId ?? '',
      managerId: employee?.managerId ?? '',
      employmentType: employee?.employmentType ?? 'FULL_TIME',
      workMode: employee?.workMode ?? 'HYBRID',
      status: employee?.status ?? 'PROBATION',
      dateOfJoining: employee?.dateOfJoining ?? todayISO(),
      bio: employee?.bio ?? '',
      createUserAccount: !isEdit,
      roles: ['EMPLOYEE'],
      changeNote: '',
    },
  });
  const { register, formState, control, setValue } = form;
  const errors = formState.errors;
  const roles = useWatch({ control, name: 'roles' });
  const createAccount = useWatch({ control, name: 'createUserAccount' });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <Card>
        <CardHeader title="Basic information" />
        <CardContent className="grid gap-4 md:grid-cols-3">
          <Field label="First name" required error={errors.firstName?.message}>
            <Input {...register('firstName')} aria-invalid={!!errors.firstName} />
          </Field>
          <Field label="Last name" required error={errors.lastName?.message}>
            <Input {...register('lastName')} aria-invalid={!!errors.lastName} />
          </Field>
          <Field label="Preferred name">
            <Input {...register('preferredName')} />
          </Field>
          <Field label="Work email" required error={errors.workEmail?.message}>
            <Input type="email" {...register('workEmail')} aria-invalid={!!errors.workEmail} />
          </Field>
          <Field label="Personal email" error={errors.personalEmail?.message}>
            <Input type="email" {...register('personalEmail')} />
          </Field>
          <Field label="Phone">
            <Input {...register('phone')} placeholder="+1 555 123 4567" />
          </Field>
          <Field label="Gender">
            <Select options={enumOptions(GENDERS)} {...register('gender')} />
          </Field>
          <Field label="Date of birth">
            <Input type="date" {...register('dateOfBirth')} />
          </Field>
          <Field label="Nationality">
            <Input {...register('nationality')} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="Job details" description="Position, reporting line and employment terms." />
        <CardContent className="grid gap-4 md:grid-cols-3">
          <Field label="Department">
            <Select placeholder="Select department" options={departments.map((d) => ({ value: d.id, label: d.name }))} {...register('departmentId')} />
          </Field>
          <Field label="Designation">
            <Select placeholder="Select designation" options={designations.map((d) => ({ value: d.id, label: `${d.title} (${d.level})` }))} {...register('designationId')} />
          </Field>
          <Field label="Location">
            <Select placeholder="Select location" options={locations.map((l) => ({ value: l.id, label: l.name }))} {...register('locationId')} />
          </Field>
          <Field label="Reports to">
            <Controller
              control={control}
              name="managerId"
              render={({ field }) => (
                <EmployeePicker
                  value={field.value}
                  initialLabel={employee?.manager?.fullName}
                  exclude={employee ? [employee.id] : []}
                  onChange={(e) => field.onChange(e?.id ?? '')}
                />
              )}
            />
          </Field>
          <Field label="Employment type">
            <Select options={enumOptions(EMPLOYMENT_TYPES)} {...register('employmentType')} />
          </Field>
          <Field label="Work mode">
            <Select options={enumOptions(WORK_MODES)} {...register('workMode')} />
          </Field>
          <Field label="Status">
            <Select options={enumOptions(EMPLOYEE_STATUSES)} {...register('status')} />
          </Field>
          <Field label="Date of joining" required error={errors.dateOfJoining?.message}>
            <Input type="date" {...register('dateOfJoining')} />
          </Field>
          {isEdit && (
            <Field label="Reason for change" hint="Recorded on the job history timeline">
              <Input {...register('changeNote')} placeholder="e.g. Annual promotion cycle" />
            </Field>
          )}
          <Field label="Bio" className="md:col-span-3">
            <Textarea {...register('bio')} rows={2} />
          </Field>
        </CardContent>
      </Card>

      {!isEdit && (
        <Card>
          <CardHeader title="System access" description="Provision a Segue HRMS login. A temporary password is generated and shown once." />
          <CardContent className="space-y-4">
            <Checkbox label="Create a user account for this employee" {...register('createUserAccount')} />
            {createAccount && (
              <div>
                <p className="mb-2 text-xs font-medium">Roles</p>
                <div className="flex flex-wrap gap-2">
                  {ROLES.filter((r) => r !== 'SUPER_ADMIN').map((r) => (
                    <Checkbox
                      key={r}
                      className="rounded-lg border border-border px-3 py-1.5"
                      label={humanize(r)}
                      checked={roles.includes(r)}
                      disabled={r === 'EMPLOYEE'}
                      onChange={(e) => setValue('roles', e.target.checked ? [...roles, r] : roles.filter((x) => x !== r))}
                    />
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" loading={submitting}>
          {isEdit ? 'Save changes' : 'Create employee'}
        </Button>
      </div>
    </form>
  );
}
