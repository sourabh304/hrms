'use client';

import { ArrowLeft, Copy } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { PageHeader } from '@/components/ui/misc';
import { useCreateEmployee } from '../api';
import type { EmployeeDetail } from '../types';
import { cleanPayload, EmployeeForm } from './employee-form';

export function NewEmployee() {
  const router = useRouter();
  const create = useCreateEmployee();
  const [created, setCreated] = useState<EmployeeDetail | null>(null);

  return (
    <>
      <Link href="/employees" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Employees
      </Link>
      <PageHeader title="Add employee" description="Creates the employee record, job history and — if enabled — a login. The default onboarding journey starts automatically." />
      <EmployeeForm
        submitting={create.isPending}
        onCancel={() => router.push('/employees')}
        onSubmit={async (values) => {
          const payload = cleanPayload(values);
          delete payload.changeNote;
          const employee = await create.mutateAsync(payload);
          toast.success(`${employee.fullName} added as ${employee.employeeCode}`);
          if (employee.temporaryPassword) setCreated(employee);
          else router.push(`/employees/${employee.id}`);
        }}
      />
      <Modal
        open={!!created}
        onClose={() => router.push(`/employees/${created!.id}`)}
        title="Account created"
        description="Share this temporary password securely. It will not be shown again."
        footer={<Button onClick={() => router.push(`/employees/${created!.id}`)}>View profile</Button>}
      >
        <div className="flex items-center justify-between rounded-lg bg-muted px-4 py-3 font-mono text-sm">
          {created?.temporaryPassword}
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Copy password"
            onClick={() => {
              navigator.clipboard.writeText(created?.temporaryPassword ?? '');
              toast.success('Copied');
            }}
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Login: {created?.workEmail}. They will be asked to change it on first sign-in.</p>
      </Modal>
    </>
  );
}
