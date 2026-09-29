'use client';

import { Briefcase, CalendarClock, Clock, HandHeart, MapPin, Plus, Search, Target, UserSearch } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { BarList } from '@/components/charts';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { Button, LinkButton } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Field, Input, Select, Textarea } from '@/components/ui/form-controls';
import { Modal } from '@/components/ui/modal';
import { EmptyState, PageHeader, PersonCell, Skeleton, StatCard } from '@/components/ui/misc';
import { Pagination, Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { Tabs } from '@/components/ui/tabs';
import { useAccess } from '@/features/auth/api';
import { PERMISSIONS } from '@/features/auth/types';
import { enumOptions } from '@/lib/options';
import { cn, formatDate, formatDateTime, humanize, timeAgo } from '@/lib/utils';
import {
  CANDIDATE_SOURCES,
  STAGES,
  useCandidates,
  useInterviewFeedback,
  useJobs,
  useMyInterviews,
  useMyReferrals,
  useRecruitmentStats,
  useRefer,
  type Interview,
  type Job,
} from '../api';
import { Stars } from '@/components/ui/stars';
import { JobFormModal } from './job-form-modal';

const STAGE_COLORS: Record<string, string> = { APPLIED: 'bg-slate-400', SCREENING: 'bg-sky-500', INTERVIEW: 'bg-indigo-500', OFFER: 'bg-amber-500', HIRED: 'bg-emerald-500' };

function PipelineBar({ pipeline }: { pipeline?: Job['pipeline'] }) {
  const stages = ['APPLIED', 'SCREENING', 'INTERVIEW', 'OFFER', 'HIRED'] as const;
  const total = stages.reduce((s, st) => s + (pipeline?.[st] ?? 0), 0);
  if (!total) return <span className="text-xs text-muted-foreground">No applicants</span>;
  return (
    <div className="flex h-2 w-40 gap-0.5 overflow-hidden rounded-full" title={stages.map((s) => `${humanize(s)}: ${pipeline?.[s] ?? 0}`).join(' · ')}>
      {stages.map((s) => (pipeline?.[s] ? <div key={s} className={STAGE_COLORS[s]} style={{ width: `${((pipeline[s] ?? 0) / total) * 100}%` }} /> : null))}
    </div>
  );
}

function JobsTable() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const { data, isLoading } = useJobs({ view: 'manage', page, status: status || undefined, search: search || undefined });
  return (
    <Card>
      <div className="flex flex-wrap gap-3 border-b border-border p-3">
        <div className="relative w-64"><Search className="absolute top-2.5 left-3 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Search jobs" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} /></div>
        <Select className="w-48" placeholder="All statuses" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} options={enumOptions(['DRAFT', 'PENDING_APPROVAL', 'OPEN', 'ON_HOLD', 'CLOSED', 'CANCELLED'])} />
      </div>
      <Table>
        <THead><tr><TH>Job</TH><TH>Department</TH><TH>Location</TH><TH>Openings</TH><TH>Pipeline</TH><TH>Hiring manager</TH><TH>Status</TH></tr></THead>
        <TBody>
          {isLoading && <tr><TD colSpan={7}><Skeleton className="h-24" /></TD></tr>}
          {data?.data.map((j) => (
            <TR key={j.id} className="cursor-pointer" onClick={() => router.push(`/recruitment/jobs/${j.id}`)}>
              <TD><p className="font-medium">{j.title}</p><p className="font-mono text-[11px] text-muted-foreground">{j.code} · posted {j.postedAt ? timeAgo(j.postedAt) : '—'}</p></TD>
              <TD>{j.department?.name ?? '—'}</TD>
              <TD className="text-muted-foreground">{j.location?.city ?? '—'}</TD>
              <TD className="tabular">{j.filled}/{j.openings}</TD>
              <TD><div className="flex items-center gap-2"><PipelineBar pipeline={j.pipeline} /><span className="text-xs text-muted-foreground">{j.active} active</span></div></TD>
              <TD className="text-muted-foreground">{j.hiringManager?.fullName ?? '—'}</TD>
              <TD><StatusBadge status={j.status} /></TD>
            </TR>
          ))}
        </TBody>
      </Table>
      {data && !data.data.length && <EmptyState icon={Briefcase} title="No requisitions" />}
      {data && <Pagination page={page} totalPages={data.meta.totalPages} total={data.meta.total} onPage={setPage} />}
    </Card>
  );
}

function CandidatesTable() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [source, setSource] = useState('');
  const { data, isLoading } = useCandidates({ page, search: search || undefined, source: source || undefined });
  return (
    <Card>
      <div className="flex flex-wrap gap-3 border-b border-border p-3">
        <div className="relative w-64"><Search className="absolute top-2.5 left-3 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Search candidates" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} /></div>
        <Select className="w-48" placeholder="All sources" value={source} onChange={(e) => { setSource(e.target.value); setPage(1); }} options={enumOptions(CANDIDATE_SOURCES)} />
      </div>
      <Table>
        <THead><tr><TH>Candidate</TH><TH>Current role</TH><TH>Experience</TH><TH>Location</TH><TH>Source</TH><TH>Added</TH></tr></THead>
        <TBody>
          {isLoading && <tr><TD colSpan={6}><Skeleton className="h-24" /></TD></tr>}
          {data?.data.map((c) => (
            <TR key={c.id}>
              <TD><PersonCell name={c.fullName} subtitle={c.email} /></TD>
              <TD className="text-muted-foreground">{c.currentTitle}{c.currentCompany && ` · ${c.currentCompany}`}</TD>
              <TD className="tabular">{c.experienceYears} yrs</TD>
              <TD>{c.location ?? '—'}</TD>
              <TD><Badge>{humanize(c.source)}</Badge>{c.referredBy && <p className="mt-1 text-[11px] text-muted-foreground">by {c.referredBy.fullName}</p>}</TD>
              <TD className="text-muted-foreground">{formatDate(c.createdAt)}</TD>
            </TR>
          ))}
        </TBody>
      </Table>
      {data && !data.data.length && <EmptyState icon={UserSearch} title="No candidates found" />}
      {data && <Pagination page={page} totalPages={data.meta.totalPages} total={data.meta.total} onPage={setPage} />}
    </Card>
  );
}

function InterviewsList() {
  const { data = [], isLoading } = useMyInterviews();
  const feedback = useInterviewFeedback();
  const [active, setActive] = useState<Interview | null>(null);
  const [f, setF] = useState({ rating: 4, recommendation: 'HIRE', feedback: '' });
  const now = new Date().toISOString();

  return (
    <Card>
      <CardHeader title="My interviews" description="Interviews where you are on the panel" />
      {isLoading && <Skeleton className="m-5 h-24" />}
      {!isLoading && !data.length && <EmptyState icon={CalendarClock} title="No interviews scheduled" />}
      <ul className="divide-y divide-border">
        {data.map((i) => (
          <li key={i.id} className="flex flex-wrap items-center gap-4 px-5 py-3.5">
            <div className={cn('w-16 shrink-0 rounded-lg border border-border py-1 text-center', i.scheduledAt > now && 'border-primary')}>
              <p className="text-[10px] font-semibold uppercase">{formatDate(i.scheduledAt, 'MMM')}</p>
              <p className="text-lg leading-none font-semibold">{formatDate(i.scheduledAt, 'd')}</p>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{i.application?.candidate.fullName} · {i.round}</p>
              <p className="text-xs text-muted-foreground">{i.application?.job?.title} · {formatDateTime(i.scheduledAt)} · {humanize(i.mode)}</p>
            </div>
            {i.meetingLink && i.status === 'SCHEDULED' && <a href={i.meetingLink} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">Join link</a>}
            {i.status === 'COMPLETED' ? <Stars value={i.rating} size="h-3.5 w-3.5" /> : <Button size="sm" variant="outline" onClick={() => setActive(i)}>Submit scorecard</Button>}
            <StatusBadge status={i.status} />
          </li>
        ))}
      </ul>
      <Modal open={!!active} onClose={() => setActive(null)} title="Interview scorecard" description={`${active?.application?.candidate.fullName} · ${active?.round}`}
        footer={<><Button variant="outline" onClick={() => setActive(null)}>Cancel</Button><Button loading={feedback.isPending} disabled={f.feedback.length < 10} onClick={async () => { await feedback.mutateAsync({ id: active!.id, ...f }); toast.success('Scorecard submitted'); setActive(null); }}>Submit</Button></>}>
        <div className="space-y-4">
          <Field label="Overall rating"><Stars value={f.rating} onChange={(rating) => setF({ ...f, rating })} size="h-6 w-6" /></Field>
          <Field label="Recommendation"><Select value={f.recommendation} onChange={(e) => setF({ ...f, recommendation: e.target.value })} options={enumOptions(['STRONG_HIRE', 'HIRE', 'NO_HIRE', 'STRONG_NO_HIRE'])} /></Field>
          <Field label="Feedback" hint="Evidence-based notes on skills and values"><Textarea rows={4} value={f.feedback} onChange={(e) => setF({ ...f, feedback: e.target.value })} /></Field>
        </div>
      </Modal>
    </Card>
  );
}

function JobBoard() {
  const { data, isLoading } = useJobs({ view: 'board', page: 1 });
  const refer = useRefer();
  const [job, setJob] = useState<Job | null>(null);
  const [f, setF] = useState({ firstName: '', lastName: '', email: '', linkedinUrl: '', note: '' });
  return (
    <>
      {isLoading && <Skeleton className="h-48" />}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data?.data.map((j) => (
          <Card key={j.id} className="flex flex-col p-5">
            <div className="flex items-start justify-between gap-2"><p className="font-semibold">{j.title}</p><Badge variant="primary">{humanize(j.workMode)}</Badge></div>
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3.5 w-3.5" />{j.location?.name} · {j.department?.name}</p>
            <p className="mt-3 line-clamp-3 flex-1 text-sm text-muted-foreground">{j.description}</p>
            <div className="mt-4 flex gap-2">
              <Button size="sm" className="flex-1" onClick={() => setJob(j)}><HandHeart className="h-4 w-4" /> Refer a friend</Button>
              <LinkButton href={`/careers/${j.id}`} target="_blank" size="sm" variant="outline">View posting</LinkButton>
            </div>
          </Card>
        ))}
      </div>
      {data && !data.data.length && <Card><EmptyState icon={Briefcase} title="No open roles right now" /></Card>}
      <Modal open={!!job} onClose={() => setJob(null)} title={`Refer for ${job?.title}`} description="Recruiters are notified instantly. You'll see the status under My referrals."
        footer={<><Button variant="outline" onClick={() => setJob(null)}>Cancel</Button><Button loading={refer.isPending} disabled={!f.firstName || !f.lastName || !f.email} onClick={async () => { await refer.mutateAsync({ jobId: job!.id, ...f, linkedinUrl: f.linkedinUrl || undefined, note: f.note || undefined }); toast.success('Referral submitted — thank you!'); setJob(null); setF({ firstName: '', lastName: '', email: '', linkedinUrl: '', note: '' }); }}>Submit referral</Button></>}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name" required><Input value={f.firstName} onChange={(e) => setF({ ...f, firstName: e.target.value })} /></Field>
          <Field label="Last name" required><Input value={f.lastName} onChange={(e) => setF({ ...f, lastName: e.target.value })} /></Field>
          <Field label="Email" required className="sm:col-span-2"><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
          <Field label="LinkedIn URL" className="sm:col-span-2"><Input value={f.linkedinUrl} onChange={(e) => setF({ ...f, linkedinUrl: e.target.value })} /></Field>
          <Field label="Why are they a great fit?" className="sm:col-span-2"><Textarea rows={3} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></Field>
        </div>
      </Modal>
    </>
  );
}

function MyReferrals() {
  const { data = [], isLoading } = useMyReferrals();
  return (
    <Card>
      <Table>
        <THead><tr><TH>Candidate</TH><TH>Role</TH><TH>Stage</TH><TH>Referred</TH></tr></THead>
        <TBody>
          {isLoading && <tr><TD colSpan={4}><Skeleton className="h-20" /></TD></tr>}
          {data.flatMap((c) => c.applications.map((a) => (
            <TR key={a.id}>
              <TD><PersonCell name={c.fullName} subtitle={c.email} /></TD>
              <TD>{a.job?.title}</TD>
              <TD><StatusBadge status={a.stage} /></TD>
              <TD className="text-muted-foreground">{formatDate(c.createdAt)}</TD>
            </TR>
          )))}
        </TBody>
      </Table>
      {!isLoading && !data.length && <EmptyState icon={HandHeart} title="You haven't referred anyone yet" description="Great people know great people — check the job board." />}
    </Card>
  );
}

export function RecruitmentPage() {
  const { can } = useAccess();
  const manage = can(PERMISSIONS.RECRUITMENT_MANAGE);
  const [tab, setTab] = useState(manage ? 'jobs' : 'board');
  const [newJob, setNewJob] = useState(false);
  const { data: stats } = useRecruitmentStats(manage);

  return (
    <>
      <PageHeader
        title="Recruitment"
        description={manage ? 'Requisitions, pipeline and hiring analytics.' : 'Open roles, referrals and your interviews.'}
        actions={<Button onClick={() => setNewJob(true)}><Plus className="h-4 w-4" /> New requisition</Button>}
      />
      {manage && stats && (
        <div className="mb-6 grid gap-4 lg:grid-cols-[repeat(3,minmax(0,1fr))_1.4fr]">
          <StatCard label="Open jobs" value={stats.openJobs} icon={Briefcase} />
          <StatCard label="Open positions" value={stats.openPositions} icon={Target} tone="info" />
          <StatCard label="Avg. time to hire" value={stats.avgTimeToHireDays ? `${stats.avgTimeToHireDays} days` : '—'} icon={Clock} tone="success" />
          <Card>
            <CardHeader title="Hiring funnel" description="All applications by stage" />
            <CardContent className="py-3"><BarList items={STAGES.slice(0, 5).map((s) => ({ name: humanize(s), value: stats.funnel[s] ?? 0 }))} /></CardContent>
          </Card>
        </div>
      )}
      <Tabs className="mb-6" value={tab} onChange={setTab} tabs={[
        { value: 'jobs', label: manage ? 'Requisitions' : 'My requisitions' },
        { value: 'candidates', label: 'Candidates', hidden: !manage },
        { value: 'interviews', label: 'My interviews' },
        { value: 'board', label: 'Internal job board' },
        { value: 'referrals', label: 'My referrals' },
      ]} />
      {tab === 'jobs' && <JobsTable />}
      {tab === 'candidates' && <CandidatesTable />}
      {tab === 'interviews' && <InterviewsList />}
      {tab === 'board' && <JobBoard />}
      {tab === 'referrals' && <MyReferrals />}
      {newJob && <JobFormModal open={newJob} onClose={() => setNewJob(false)} />}
    </>
  );
}
