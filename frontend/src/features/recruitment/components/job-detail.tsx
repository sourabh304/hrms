'use client';

import { ArrowLeft, Briefcase, MapPin, Pencil, Users } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, PageLoader } from '@/components/ui/misc';
import { Tabs } from '@/components/ui/tabs';
import { useAccess } from '@/features/auth/api';
import { PERMISSIONS } from '@/features/auth/types';
import { useApprovalTrail } from '@/features/workflow/api';
import { ApprovalChain } from '@/features/workflow/components/approval-chain';
import { cn, formatDate, formatMoney, humanize, timeAgo } from '@/lib/utils';
import { useJob, useMoveStage, usePipeline, useSetJobStatus, useSubmitJob, type Application, type Stage } from '../api';
import { Stars } from '@/components/ui/stars';
import { CandidateModal } from './candidate-modal';
import { JobFormModal } from './job-form-modal';

const COLUMN_TONE: Partial<Record<Stage, string>> = {
  APPLIED: 'border-t-slate-400',
  SCREENING: 'border-t-sky-500',
  INTERVIEW: 'border-t-indigo-500',
  OFFER: 'border-t-amber-500',
  HIRED: 'border-t-emerald-500',
};

function Kanban({ jobId, onOpen }: { jobId: string; onOpen: (a: Application) => void }) {
  const { data = [] } = usePipeline(jobId);
  const move = useMoveStage();
  const { can } = useAccess();
  const [dragging, setDragging] = useState<Application | null>(null);
  const [over, setOver] = useState<Stage | null>(null);
  const columns = data.filter((c) => c.stage !== 'WITHDRAWN' && c.stage !== 'REJECTED');
  const closed = data.filter((c) => c.stage === 'REJECTED' || c.stage === 'WITHDRAWN').flatMap((c) => c.applications);

  const drop = async (stage: Stage) => {
    setOver(null);
    const app = dragging;
    setDragging(null);
    if (!app || app.stage === stage) return;
    // Offer, hire and reject need extra input — open the candidate panel instead.
    if (stage === 'OFFER' || stage === 'HIRED') return onOpen(app);
    await move.mutateAsync({ id: app.id, stage });
    toast.success(`${app.candidate.fullName} → ${humanize(stage)}`);
  };

  return (
    <div className="space-y-4">
      <div className="scrollbar-thin flex gap-4 overflow-x-auto pb-2">
        {columns.map((col) => (
          <div
            key={col.stage}
            onDragOver={(e) => { e.preventDefault(); setOver(col.stage); }}
            onDragLeave={() => setOver(null)}
            onDrop={() => drop(col.stage)}
            className={cn('flex w-72 shrink-0 flex-col rounded-xl border border-t-4 border-border bg-muted/40 transition-colors', COLUMN_TONE[col.stage], over === col.stage && 'bg-primary-soft/50')}
          >
            <div className="flex items-center justify-between px-3 py-2.5">
              <p className="text-sm font-semibold">{humanize(col.stage)}</p>
              <span className="tabular rounded-full bg-card px-2 text-xs text-muted-foreground">{col.applications.length}</span>
            </div>
            <div className="min-h-40 space-y-2 px-2 pb-2">
              {col.applications.map((a) => (
                <button
                  key={a.id}
                  draggable={can(PERMISSIONS.RECRUITMENT_MANAGE) && col.stage !== 'HIRED'}
                  onDragStart={() => setDragging(a)}
                  onClick={() => onOpen(a)}
                  className="w-full cursor-pointer rounded-lg border border-border bg-card p-3 text-left shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing"
                >
                  <div className="flex items-center gap-2.5">
                    <Avatar name={a.candidate.fullName} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{a.candidate.fullName}</p>
                      <p className="truncate text-xs text-muted-foreground">{a.candidate.currentTitle} · {a.candidate.experienceYears}y</p>
                    </div>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between">
                    <Stars value={a.rating} size="h-3 w-3" />
                    <span className="text-[10px] text-muted-foreground">{timeAgo(a.stageChangedAt)}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <Badge>{humanize(a.candidate.source)}</Badge>
                    {!!a.interviews?.length && <Badge variant="primary">{a.interviews.length} interview{a.interviews.length > 1 ? 's' : ''}</Badge>}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      {!!closed.length && (
        <Card>
          <CardHeader title={`Not progressing (${closed.length})`} />
          <ul className="divide-y divide-border">
            {closed.map((a) => (
              <li key={a.id}>
                <button onClick={() => onOpen(a)} className="flex w-full cursor-pointer items-center gap-3 px-5 py-2.5 text-left hover:bg-muted/50">
                  <Avatar name={a.candidate.fullName} size="xs" />
                  <span className="flex-1 text-sm">{a.candidate.fullName}</span>
                  <span className="max-w-xs truncate text-xs text-muted-foreground">{a.rejectionReason}</span>
                  <StatusBadge status={a.stage} />
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

export function JobDetail({ id }: { id: string }) {
  const { data: job, isLoading } = useJob(id);
  const { can, employeeId } = useAccess();
  const setStatus = useSetJobStatus();
  const submit = useSubmitJob();
  const { data: trail } = useApprovalTrail('JOB_REQUISITION', job?.approvalRequestId ? job.id : null);
  const [tab, setTab] = useState('pipeline');
  const [open, setOpen] = useState<Application | null>(null);
  const [editing, setEditing] = useState(false);

  if (isLoading || !job) return <PageLoader />;
  const manage = can(PERMISSIONS.RECRUITMENT_MANAGE);
  const total = Object.values(job.pipeline ?? {}).reduce((s, n) => s + (n ?? 0), 0);

  return (
    <>
      <Link href="/recruitment" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Recruitment</Link>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold">{job.title}</h1>
            <StatusBadge status={job.status} />
            <span className="font-mono text-xs text-muted-foreground">{job.code}</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><Briefcase className="h-4 w-4" />{job.department?.name} · {humanize(job.employmentType)}</span>
            <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" />{job.location?.name ?? 'Remote'} · {humanize(job.workMode)}</span>
            <span className="flex items-center gap-1.5"><Users className="h-4 w-4" />{job.filled}/{job.openings} filled · {total} applicants</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {manage && <Button variant="outline" onClick={() => setEditing(true)}><Pencil className="h-4 w-4" /> Edit</Button>}
          {job.status === 'DRAFT' && (manage || job.hiringManager?.id === employeeId) && <Button loading={submit.isPending} onClick={async () => { await submit.mutateAsync(job.id); toast.success('Submitted for approval'); }}>Submit for approval</Button>}
          {manage && job.status === 'OPEN' && <Button variant="outline" onClick={() => setStatus.mutate({ id: job.id, status: 'ON_HOLD' })}>Put on hold</Button>}
          {manage && job.status === 'ON_HOLD' && <Button onClick={() => setStatus.mutate({ id: job.id, status: 'OPEN' })}>Reopen</Button>}
          {manage && (job.status === 'OPEN' || job.status === 'ON_HOLD') && <Button variant="outline" onClick={() => setStatus.mutate({ id: job.id, status: 'CLOSED' })}>Close job</Button>}
        </div>
      </div>

      <Tabs className="mb-6" value={tab} onChange={setTab} tabs={[{ value: 'pipeline', label: 'Pipeline', count: total }, { value: 'details', label: 'Job details' }]} />
      {tab === 'pipeline' && <Kanban jobId={job.id} onOpen={setOpen} />}
      {tab === 'details' && (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <Card>
            <CardContent className="space-y-6">
              <div><p className="mb-2 text-sm font-semibold">About the role</p><p className="text-sm leading-relaxed whitespace-pre-line text-muted-foreground">{job.description}</p></div>
              {job.requirements && (
                <div><p className="mb-2 text-sm font-semibold">Requirements</p>
                  <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">{job.requirements.split('\n').filter(Boolean).map((r) => <li key={r}>{r}</li>)}</ul>
                </div>
              )}
              {!!job.skills?.length && <div className="flex flex-wrap gap-1.5">{job.skills.map((s) => <Badge key={s} variant="primary">{s}</Badge>)}</div>}
            </CardContent>
          </Card>
          <div className="space-y-6">
            <Card>
              <CardContent className="space-y-3 text-sm">
                <p><span className="text-muted-foreground">Hiring manager:</span> {job.hiringManager?.fullName ?? '—'}</p>
                <p><span className="text-muted-foreground">Recruiter:</span> {job.recruiter?.fullName ?? '—'}</p>
                <p><span className="text-muted-foreground">Experience:</span> {job.experienceMin}{job.experienceMax ? `–${job.experienceMax}` : '+'} years</p>
                {job.salaryMin != null && <p><span className="text-muted-foreground">Salary:</span> {formatMoney(job.salaryMin, 'USD', true)} – {formatMoney(job.salaryMax, 'USD', true)}</p>}
                <p><span className="text-muted-foreground">Posted:</span> {formatDate(job.postedAt)}</p>
                <p><span className="text-muted-foreground">Careers site:</span> {job.isPublished ? 'Published' : 'Internal only'}</p>
              </CardContent>
            </Card>
            {trail && (
              <Card>
                <CardHeader title="Requisition approval" />
                <CardContent><ApprovalChain steps={trail.steps} submittedAt={trail.createdAt} /></CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
      <CandidateModal application={open ? { ...open, job } : null} onClose={() => setOpen(null)} />
      {editing && <JobFormModal open={editing} onClose={() => setEditing(false)} job={job} />}
    </>
  );
}
