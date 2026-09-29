'use client';

import { CalendarClock, ExternalLink, Mail, Phone, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox, Field, Input, Select, Textarea } from '@/components/ui/form-controls';
import { Modal } from '@/components/ui/modal';
import { Avatar, KeyValue, PageLoader } from '@/components/ui/misc';
import { Stars } from '@/components/ui/stars';
import { useAccess } from '@/features/auth/api';
import { PERMISSIONS } from '@/features/auth/types';
import { EmployeePicker } from '@/features/employees/components/employee-picker';
import { enumOptions } from '@/lib/options';
import { formatDate, formatDateTime, formatMoney, humanize, todayISO } from '@/lib/utils';
import { STAGES, useCandidate, useHire, useMoveStage, useRateApplication, useScheduleInterview, type Application, type Stage } from '../api';

/** Candidate profile + actions for one application (stage moves, interviews, offer, hire). */
export function CandidateModal({ application, onClose }: { application: Application | null; onClose: () => void }) {
  const { data: candidate, isLoading } = useCandidate(application?.candidateId ?? null);
  const { can } = useAccess();
  const move = useMoveStage();
  const rate = useRateApplication();
  const schedule = useScheduleInterview();
  const hire = useHire();
  const [panel, setPanel] = useState<'none' | 'reject' | 'offer' | 'interview' | 'hire'>('none');
  const [form, setForm] = useState({ reason: '', salary: '', interviewerId: '', round: 'Technical interview', scheduledAt: '', mode: 'VIDEO', joining: todayISO(), account: true });

  if (!application) return null;
  const app = candidate?.applications?.find((a) => a.id === application.id) ?? application;
  const terminal = app.stage === 'HIRED' || app.stage === 'REJECTED' || app.stage === 'WITHDRAWN';

  const moveTo = async (stage: Stage, extra: { rejectionReason?: string; offeredSalary?: number } = {}) => {
    await move.mutateAsync({ id: app.id, stage, ...extra });
    toast.success(`Moved to ${humanize(stage)}`);
    setPanel('none');
  };

  return (
    <Modal open onClose={onClose} title="Candidate" size="xl">
      {isLoading || !candidate ? (
        <PageLoader />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <Avatar name={candidate.fullName} size="lg" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold">{candidate.fullName}</h3>
                <p className="text-sm text-muted-foreground">{candidate.currentTitle}{candidate.currentCompany && ` at ${candidate.currentCompany}`}</p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{candidate.email}</span>
                  {candidate.phone && <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{candidate.phone}</span>}
                  {candidate.linkedinUrl && <a href={candidate.linkedinUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-primary hover:underline"><ExternalLink className="h-3.5 w-3.5" />LinkedIn</a>}
                  {candidate.resumeUrl && <a href={candidate.resumeUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-primary hover:underline"><ExternalLink className="h-3.5 w-3.5" />Résumé</a>}
                </div>
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-4 rounded-lg border border-border p-4 sm:grid-cols-4">
              <KeyValue label="Experience" value={`${candidate.experienceYears} yrs`} />
              <KeyValue label="Location" value={candidate.location} />
              <KeyValue label="Source" value={humanize(candidate.source)} />
              <KeyValue label="Referred by" value={candidate.referredBy?.fullName ?? '—'} />
            </dl>
            {!!candidate.skills?.length && (
              <div className="flex flex-wrap gap-1.5">
                {candidate.skills.map((s) => <span key={s} className="rounded-full bg-muted px-2.5 py-1 text-xs">{s}</span>)}
              </div>
            )}
            {app.coverLetter && <div><p className="mb-1 text-xs font-semibold text-muted-foreground uppercase">Cover letter</p><p className="text-sm whitespace-pre-line text-muted-foreground">{app.coverLetter}</p></div>}

            <div>
              <p className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Interviews & scorecards</p>
              {!app.interviews?.length && <p className="text-sm text-muted-foreground">No interviews scheduled yet.</p>}
              <ul className="space-y-3">
                {app.interviews?.map((i) => (
                  <li key={i.id} className="rounded-lg border border-border p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{i.round}</p>
                      <StatusBadge status={i.status} />
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{i.interviewer?.fullName} · {formatDateTime(i.scheduledAt)} · {humanize(i.mode)}</p>
                    {i.feedback && (
                      <div className="mt-2 rounded-md bg-muted p-2.5">
                        <div className="flex items-center gap-2"><Stars value={i.rating} size="h-3.5 w-3.5" /><StatusBadge status={i.recommendation?.includes('NO') ? 'REJECTED' : 'APPROVED'} label={humanize(i.recommendation)} /></div>
                        <p className="mt-1.5 text-xs">{i.feedback}</p>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-lg border border-border p-4">
              <p className="text-xs text-muted-foreground">Applied for</p>
              <p className="text-sm font-medium">{app.job?.title ?? 'This role'}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">on {formatDate(app.appliedAt)}</p>
              <div className="mt-3 flex items-center justify-between">
                <StatusBadge status={app.stage} />
                <Stars value={app.rating} onChange={can(PERMISSIONS.RECRUITMENT_MANAGE) ? async (n) => { await rate.mutateAsync({ id: app.id, rating: n }); } : undefined} />
              </div>
              {app.offeredSalary && <p className="mt-2 text-xs text-muted-foreground">Offer: <span className="font-medium text-foreground">{formatMoney(app.offeredSalary)}</span></p>}
              {app.rejectionReason && <p className="mt-2 text-xs text-danger">{app.rejectionReason}</p>}
            </div>

            {can(PERMISSIONS.RECRUITMENT_MANAGE) && !terminal && (
              <div className="space-y-2">
                <Field label="Move to stage">
                  <Select value={app.stage} onChange={(e) => {
                    const s = e.target.value as Stage;
                    if (s === 'REJECTED') setPanel('reject');
                    else if (s === 'OFFER') setPanel('offer');
                    else if (s === 'HIRED') setPanel('hire');
                    else moveTo(s);
                  }} options={STAGES.filter((s) => s !== 'WITHDRAWN').map((s) => ({ value: s, label: humanize(s) }))} />
                </Field>
                <Button variant="outline" className="w-full" onClick={() => setPanel('interview')}><CalendarClock className="h-4 w-4" /> Schedule interview</Button>
                {app.stage === 'OFFER' && can(PERMISSIONS.EMPLOYEE_WRITE) && <Button variant="success" className="w-full" onClick={() => setPanel('hire')}><UserPlus className="h-4 w-4" /> Hire candidate</Button>}
              </div>
            )}

            {panel === 'reject' && (
              <div className="space-y-2 rounded-lg bg-danger-soft/50 p-3">
                <Field label="Rejection reason"><Textarea rows={2} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></Field>
                <Button variant="danger" size="sm" disabled={!form.reason} loading={move.isPending} onClick={() => moveTo('REJECTED', { rejectionReason: form.reason })}>Reject candidate</Button>
              </div>
            )}
            {panel === 'offer' && (
              <div className="space-y-2 rounded-lg bg-warning-soft/50 p-3">
                <Field label="Offered annual salary"><Input type="number" value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} /></Field>
                <Button size="sm" loading={move.isPending} onClick={() => moveTo('OFFER', { offeredSalary: Number(form.salary) || undefined })}>Extend offer</Button>
              </div>
            )}
            {panel === 'interview' && (
              <div className="space-y-2 rounded-lg bg-muted p-3">
                <Field label="Interviewer"><EmployeePicker onChange={(e) => setForm({ ...form, interviewerId: e?.id ?? '' })} /></Field>
                <Field label="Round"><Input value={form.round} onChange={(e) => setForm({ ...form, round: e.target.value })} /></Field>
                <Field label="When"><Input type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} /></Field>
                <Field label="Mode"><Select value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })} options={enumOptions(['VIDEO', 'ONSITE', 'PHONE'])} /></Field>
                <Button size="sm" disabled={!form.interviewerId || !form.scheduledAt} loading={schedule.isPending} onClick={async () => {
                  await schedule.mutateAsync({ applicationId: app.id, interviewerId: form.interviewerId, round: form.round, scheduledAt: new Date(form.scheduledAt).toISOString(), mode: form.mode });
                  toast.success('Interview scheduled — interviewer notified');
                  setPanel('none');
                }}>Schedule</Button>
              </div>
            )}
            {panel === 'hire' && (
              <div className="space-y-2 rounded-lg bg-success-soft/50 p-3">
                <Field label="Date of joining"><Input type="date" value={form.joining} onChange={(e) => setForm({ ...form, joining: e.target.value })} /></Field>
                <Checkbox label="Create login account" checked={form.account} onChange={(e) => setForm({ ...form, account: e.target.checked })} />
                <p className="text-[11px] text-muted-foreground">Creates the employee record{app.offeredSalary ? ', salary structure' : ''} and starts the onboarding journey.</p>
                <Button variant="success" size="sm" loading={hire.isPending} onClick={async () => {
                  const r = await hire.mutateAsync({ id: app.id, dateOfJoining: form.joining, createUserAccount: form.account });
                  toast.success(`Hired! ${r.employee.fullName} is now ${r.employee.employeeCode}`);
                  onClose();
                }}>Confirm hire</Button>
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
