'use client';

import { addDays, format } from 'date-fns';
import { DoorOpen, LogOut, MessageSquareQuote, UserX } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Checkbox, Field, Input, Select, Textarea } from '@/components/ui/form-controls';
import { ConfirmDialog, Modal } from '@/components/ui/modal';
import { EmptyState, PageHeader, PersonCell, Skeleton } from '@/components/ui/misc';
import { Stars } from '@/components/ui/stars';
import { Pagination, Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { Tabs } from '@/components/ui/tabs';
import { useAccess } from '@/features/auth/api';
import { PERMISSIONS } from '@/features/auth/types';
import { EmployeePicker } from '@/features/employees/components/employee-picker';
import { useSettings } from '@/features/organization/api';
import { useApprovalTrail } from '@/features/workflow/api';
import { ApprovalChain } from '@/features/workflow/components/approval-chain';
import { enumOptions } from '@/lib/options';
import { formatDate, humanize, todayISO } from '@/lib/utils';
import { useInitiateSeparation, useResign, useSeparationAction, useSeparations, type Separation } from '../api';

function ExitInterviewModal({ separation, onClose }: { separation: Separation; onClose: () => void }) {
  const action = useSeparationAction();
  const [f, setF] = useState({ overallRating: 4, primaryReason: 'Career growth', wouldRecommend: true, feedback: '' });
  return (
    <Modal open onClose={onClose} title="Exit interview" description="Your candid feedback helps us improve. HR reviews responses in aggregate."
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button loading={action.isPending} onClick={async () => { await action.mutateAsync({ id: separation.id, action: 'exit-interview', body: f }); toast.success('Thank you for your feedback'); onClose(); }}>Submit</Button></>}>
      <div className="space-y-4">
        <Field label="Overall experience at the company"><Stars value={f.overallRating} onChange={(n) => setF({ ...f, overallRating: n })} size="h-6 w-6" /></Field>
        <Field label="Primary reason for leaving"><Select value={f.primaryReason} onChange={(e) => setF({ ...f, primaryReason: e.target.value })} options={['Career growth', 'Compensation', 'Manager relationship', 'Work-life balance', 'Relocation', 'Further studies', 'Career change', 'Other'].map((v) => ({ value: v, label: v }))} /></Field>
        <Checkbox label="I would recommend Segue as a place to work" checked={f.wouldRecommend} onChange={(e) => setF({ ...f, wouldRecommend: e.target.checked })} />
        <Field label="What could we have done better?"><Textarea rows={4} value={f.feedback} onChange={(e) => setF({ ...f, feedback: e.target.value })} /></Field>
      </div>
    </Modal>
  );
}

function MySeparation() {
  const { data, isLoading } = useSeparations('me');
  const { data: settings } = useSettings();
  const resign = useResign();
  const action = useSeparationAction();
  const current = data?.data.find((s) => s.status === 'PENDING_APPROVAL' || s.status === 'APPROVED');
  const { data: trail } = useApprovalTrail('SEPARATION', current?.approvalRequestId ? current.id : null);
  const notice = settings?.noticePeriodDays ?? 30;
  const [f, setF] = useState({ reason: '', requestedLastDay: format(addDays(new Date(), notice), 'yyyy-MM-dd') });
  const [confirm, setConfirm] = useState(false);
  const [interview, setInterview] = useState(false);

  if (isLoading) return <Skeleton className="h-64" />;

  if (current) {
    return (
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader title="Your resignation" action={<StatusBadge status={current.status} />} />
          <CardContent className="space-y-4">
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div><dt className="text-xs text-muted-foreground">Submitted</dt><dd className="font-medium">{formatDate(current.noticeDate)}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Last working day</dt><dd className="font-medium">{formatDate(current.approvedLastDay ?? current.requestedLastDay)}</dd></div>
            </dl>
            <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">“{current.reason}”</p>
            <div className="flex flex-wrap gap-2">
              {current.status === 'APPROVED' && !current.exitInterview && <Button onClick={() => setInterview(true)}><MessageSquareQuote className="h-4 w-4" /> Complete exit interview</Button>}
              {current.exitInterview && <StatusBadge status="COMPLETED" label="Exit interview submitted" />}
              <Button variant="outline" loading={action.isPending} onClick={async () => { await action.mutateAsync({ id: current.id, action: 'withdraw' }); toast.success('Resignation withdrawn'); }}>Withdraw resignation</Button>
            </div>
          </CardContent>
        </Card>
        {trail && <Card><CardHeader title="Approval progress" /><CardContent><ApprovalChain steps={trail.steps} submittedAt={trail.createdAt} /></CardContent></Card>}
        {interview && <ExitInterviewModal separation={current} onClose={() => setInterview(false)} />}
      </div>
    );
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader title="Submit resignation" description={`The standard notice period is ${notice} days. Your manager and HR will review your request.`} />
      <CardContent className="space-y-4">
        <Field label="Proposed last working day" hint={`Default: ${notice} days from today`}><Input type="date" min={todayISO()} value={f.requestedLastDay} onChange={(e) => setF({ ...f, requestedLastDay: e.target.value })} /></Field>
        <Field label="Reason" required><Textarea rows={4} value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} placeholder="Share as much as you're comfortable with" /></Field>
        <Button variant="danger" disabled={f.reason.length < 10} onClick={() => setConfirm(true)}><DoorOpen className="h-4 w-4" /> Submit resignation</Button>
      </CardContent>
      <ConfirmDialog open={confirm} onClose={() => setConfirm(false)} title="Submit your resignation?" message="This starts the separation workflow. You can withdraw it until your last day." confirmLabel="Yes, submit" variant="danger" loading={resign.isPending}
        onConfirm={async () => { await resign.mutateAsync(f); toast.success('Resignation submitted'); setConfirm(false); }} />
    </Card>
  );
}

function SeparationsTable({ scope }: { scope: 'team' | 'all' }) {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useSeparations(scope, page);
  const action = useSeparationAction();
  const [completing, setCompleting] = useState<Separation | null>(null);
  const [rehire, setRehire] = useState(true);
  const [viewing, setViewing] = useState<Separation | null>(null);
  return (
    <Card>
      <Table>
        <THead><tr><TH>Employee</TH><TH>Type</TH><TH>Notice given</TH><TH>Last day</TH><TH>Exit interview</TH><TH>Status</TH><TH /></tr></THead>
        <TBody>
          {isLoading && <tr><TD colSpan={7}><Skeleton className="h-20" /></TD></tr>}
          {data?.data.map((s) => (
            <TR key={s.id}>
              <TD><PersonCell name={s.employee.fullName} src={s.employee.avatarUrl} subtitle={s.employee.designation?.title} /></TD>
              <TD>{humanize(s.type)}</TD>
              <TD>{formatDate(s.noticeDate)}</TD>
              <TD className="font-medium">{formatDate(s.approvedLastDay ?? s.requestedLastDay)}</TD>
              <TD>{s.exitInterview ? <button className="cursor-pointer text-xs text-primary hover:underline" onClick={() => setViewing(s)}>View ({s.exitInterview.overallRating}/5)</button> : <span className="text-xs text-muted-foreground">Pending</span>}</TD>
              <TD><StatusBadge status={s.status} /></TD>
              <TD className="text-right">{scope === 'all' && s.status === 'APPROVED' && <Button size="sm" variant="secondary" onClick={() => setCompleting(s)}>Complete exit</Button>}</TD>
            </TR>
          ))}
        </TBody>
      </Table>
      {data && !data.data.length && <EmptyState icon={LogOut} title="No separations" />}
      {data && <Pagination page={page} totalPages={data.meta.totalPages} total={data.meta.total} onPage={setPage} />}
      <ConfirmDialog open={!!completing} onClose={() => setCompleting(null)} title="Complete exit" variant="danger" confirmLabel="Complete exit" loading={action.isPending}
        message={completing ? `${completing.employee.fullName} will be marked as exited and their system access revoked.` : ''}
        onConfirm={async () => { await action.mutateAsync({ id: completing!.id, action: 'complete', body: { isRehireEligible: rehire } }); toast.success('Exit completed'); setCompleting(null); }}>
        <Checkbox className="mt-4" label="Eligible for rehire" checked={rehire} onChange={(e) => setRehire(e.target.checked)} />
      </ConfirmDialog>
      <Modal open={!!viewing} onClose={() => setViewing(null)} title={`Exit interview — ${viewing?.employee.fullName}`}>
        {viewing?.exitInterview && (
          <div className="space-y-3 text-sm">
            <Stars value={viewing.exitInterview.overallRating} />
            <p><span className="text-muted-foreground">Primary reason:</span> {viewing.exitInterview.primaryReason}</p>
            <p><span className="text-muted-foreground">Would recommend:</span> {viewing.exitInterview.wouldRecommend ? 'Yes' : 'No'}</p>
            <p className="rounded-lg bg-muted p-3">{viewing.exitInterview.feedback}</p>
          </div>
        )}
      </Modal>
    </Card>
  );
}

function InitiateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const initiate = useInitiateSeparation();
  const [f, setF] = useState({ employeeId: '', type: 'TERMINATION', reason: '', lastDay: todayISO() });
  return (
    <Modal open={open} onClose={onClose} title="Initiate separation" description="HR-initiated separations are approved immediately and start the offboarding journey."
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button variant="danger" disabled={!f.employeeId || f.reason.length < 5} loading={initiate.isPending} onClick={async () => { await initiate.mutateAsync(f); toast.success('Separation initiated'); onClose(); }}>Initiate</Button></>}>
      <div className="space-y-4">
        <Field label="Employee" required><EmployeePicker onChange={(e) => setF({ ...f, employeeId: e?.id ?? '' })} /></Field>
        <Field label="Type"><Select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} options={enumOptions(['TERMINATION', 'RETIREMENT', 'END_OF_CONTRACT', 'RESIGNATION'])} /></Field>
        <Field label="Last working day"><Input type="date" value={f.lastDay} onChange={(e) => setF({ ...f, lastDay: e.target.value })} /></Field>
        <Field label="Reason" required><Textarea rows={3} value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} /></Field>
      </div>
    </Modal>
  );
}

export function OffboardingPage() {
  const { can, isManager } = useAccess();
  const manage = can(PERMISSIONS.OFFBOARDING_MANAGE);
  const [tab, setTab] = useState(manage ? 'all' : 'me');
  const [initiate, setInitiate] = useState(false);
  return (
    <>
      <PageHeader title="Offboarding" description="Resignations, exit interviews and clearance." actions={manage && <Button variant="outline" onClick={() => setInitiate(true)}><UserX className="h-4 w-4" /> Initiate separation</Button>} />
      <Tabs className="mb-6" value={tab} onChange={setTab} tabs={[
        { value: 'all', label: 'All separations', hidden: !manage },
        { value: 'team', label: 'My team', hidden: !isManager },
        { value: 'me', label: 'My resignation' },
      ]} />
      {tab === 'me' && <MySeparation />}
      {tab === 'team' && <SeparationsTable scope="team" />}
      {tab === 'all' && <SeparationsTable scope="all" />}
      {initiate && <InitiateModal open={initiate} onClose={() => setInitiate(false)} />}
    </>
  );
}
