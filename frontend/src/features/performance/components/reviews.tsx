'use client';

import { ClipboardCheck, Rocket } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { ColumnChart } from '@/components/charts';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Field, Input, Select, Textarea } from '@/components/ui/form-controls';
import { Modal } from '@/components/ui/modal';
import { EmptyState, PageLoader, PersonCell, Skeleton, StatCard } from '@/components/ui/misc';
import { Stars } from '@/components/ui/stars';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { useAccess } from '@/features/auth/api';
import { formatDate } from '@/lib/utils';
import { useCalibrate, useCycles, useCycleStats, useLaunchCycle, useReview, useReviews, useSaveCycle, useSubmitReview, type PerformanceReview, type ReviewCycle } from '../api';
import { GoalCard } from './goals';

const RATING_LABELS = ['', 'Needs improvement', 'Partially meets', 'Meets expectations', 'Exceeds expectations', 'Outstanding'];

function ReviewForm({ reviewId, as, onClose }: { reviewId: string; as: 'self' | 'manager'; onClose: () => void }) {
  const { data: r, isLoading } = useReview(reviewId);
  const submit = useSubmitReview();
  const [rating, setRating] = useState<number | null>(null);
  const [comments, setComments] = useState('');
  const [strengths, setStrengths] = useState('');
  const [improvements, setImprovements] = useState('');
  const [comp, setComp] = useState<Record<string, number>>({});

  if (isLoading || !r) return <Modal open onClose={onClose} title="Review"><PageLoader /></Modal>;
  const canSubmit = (as === 'self' && r.status === 'SELF_REVIEW') || (as === 'manager' && r.status === 'MANAGER_REVIEW');
  const allRated = rating && r.competencies.every((c) => comp[c.name]);

  return (
    <Modal open onClose={onClose} size="xl" title={`${r.cycle.name} — ${as === 'self' ? 'Self review' : `Review for ${r.employee.fullName}`}`} description={as === 'self' ? `Due ${formatDate(r.cycle.selfReviewDue)}` : `Due ${formatDate(r.cycle.managerReviewDue)}`}
      footer={canSubmit ? <><Button variant="outline" onClick={onClose}>Cancel</Button><Button disabled={!allRated || comments.length < 20} loading={submit.isPending} onClick={async () => {
        await submit.mutateAsync({ id: r.id, as, rating: rating!, comments, competencies: Object.entries(comp).map(([name, v]) => ({ name, rating: v })), ...(as === 'manager' ? { strengths, improvements } : {}) });
        toast.success('Review submitted');
        onClose();
      }}>Submit review</Button></> : undefined}>
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-5">
          {as === 'manager' && r.selfSubmittedAt && (
            <div className="rounded-lg border border-border p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Employee self-assessment</p>
              <div className="mt-2 flex items-center gap-2"><Stars value={r.selfRating} /><span className="text-sm">{RATING_LABELS[r.selfRating ?? 0]}</span></div>
              <p className="mt-2 text-sm text-muted-foreground">{r.selfComments}</p>
            </div>
          )}
          {!canSubmit ? (
            <div className="space-y-3">
              <div className="rounded-lg bg-muted p-4">
                <p className="text-xs text-muted-foreground">Status</p>
                <StatusBadge status={r.status} />
                {r.status === 'COMPLETED' && (
                  <div className="mt-3 space-y-2 text-sm">
                    <div className="flex items-center gap-2"><span className="w-28 text-muted-foreground">Final rating</span><Stars value={Math.round(r.finalRating ?? 0)} /><span>{RATING_LABELS[Math.round(r.finalRating ?? 0)]}</span></div>
                    <p><span className="text-muted-foreground">Manager comments:</span> {r.managerComments}</p>
                    {r.strengths && <p><span className="text-muted-foreground">Strengths:</span> {r.strengths}</p>}
                    {r.improvements && <p><span className="text-muted-foreground">Growth areas:</span> {r.improvements}</p>}
                  </div>
                )}
                {r.status === 'MANAGER_REVIEW' && as === 'self' && <p className="mt-2 text-sm text-muted-foreground">Your self-review is submitted. Your manager&apos;s review is in progress.</p>}
              </div>
              <Table>
                <THead><tr><TH>Competency</TH><TH>Self</TH><TH>Manager</TH></tr></THead>
                <TBody>{r.competencies.map((c) => <TR key={c.name}><TD>{c.name}</TD><TD><Stars value={c.self} size="h-3.5 w-3.5" /></TD><TD><Stars value={c.manager} size="h-3.5 w-3.5" /></TD></TR>)}</TBody>
              </Table>
            </div>
          ) : (
            <>
              <div>
                <p className="mb-2 text-sm font-semibold">Competencies</p>
                <div className="divide-y divide-border rounded-lg border border-border">
                  {r.competencies.map((c) => (
                    <div key={c.name} className="flex items-center justify-between px-4 py-2.5">
                      <span className="text-sm">{c.name}{as === 'manager' && c.self && <span className="ml-2 text-xs text-muted-foreground">(self: {c.self})</span>}</span>
                      <Stars value={comp[c.name] ?? null} onChange={(n) => setComp({ ...comp, [c.name]: n })} />
                    </div>
                  ))}
                </div>
              </div>
              <Field label="Overall rating" required>
                <div className="flex items-center gap-3"><Stars value={rating} onChange={setRating} size="h-6 w-6" /><span className="text-sm text-muted-foreground">{RATING_LABELS[rating ?? 0]}</span></div>
              </Field>
              <Field label={as === 'self' ? 'Summary of your contributions' : 'Overall feedback'} required hint="At least 20 characters"><Textarea rows={4} value={comments} onChange={(e) => setComments(e.target.value)} /></Field>
              {as === 'manager' && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Key strengths"><Textarea rows={2} value={strengths} onChange={(e) => setStrengths(e.target.value)} /></Field>
                  <Field label="Growth areas"><Textarea rows={2} value={improvements} onChange={(e) => setImprovements(e.target.value)} /></Field>
                </div>
              )}
            </>
          )}
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold">Goals this cycle</p>
          <div className="space-y-3">
            {r.goals?.length ? r.goals.map((g) => <GoalCard key={g.id} goal={g} />) : <p className="text-sm text-muted-foreground">No goals linked.</p>}
          </div>
        </div>
      </div>
    </Modal>
  );
}

export function MyReviews() {
  const { data = [], isLoading } = useReviews('me');
  const [open, setOpen] = useState<string | null>(null);
  if (isLoading) return <Skeleton className="h-40" />;
  if (!data.length) return <Card><EmptyState icon={ClipboardCheck} title="No reviews yet" description="Reviews appear here when HR launches a review cycle." /></Card>;
  return (
    <div className="space-y-3">
      {data.map((r) => (
        <Card key={r.id} className="flex flex-wrap items-center gap-4 p-5">
          <div className="flex-1">
            <p className="font-semibold">{r.cycle.name}</p>
            <p className="text-xs text-muted-foreground">Reviewer: {r.reviewer?.fullName ?? 'HR'} · self-review due {formatDate(r.cycle.selfReviewDue)}</p>
          </div>
          {r.status === 'COMPLETED' && <Stars value={Math.round(r.finalRating ?? 0)} />}
          <StatusBadge status={r.status} label={r.status === 'SELF_REVIEW' ? 'Self review due' : undefined} />
          <Button variant={r.status === 'SELF_REVIEW' ? 'primary' : 'outline'} size="sm" onClick={() => setOpen(r.id)}>{r.status === 'SELF_REVIEW' ? 'Start self review' : 'View'}</Button>
        </Card>
      ))}
      {open && <ReviewForm reviewId={open} as="self" onClose={() => setOpen(null)} />}
    </div>
  );
}

export function TeamReviews() {
  const { data = [], isLoading } = useReviews('team');
  const [open, setOpen] = useState<string | null>(null);
  const active = data.filter((r) => r.cycle.status === 'ACTIVE');
  return (
    <Card>
      <CardHeader title="Reviews you own" description="Complete a manager review once the employee has submitted their self-review." />
      {isLoading && <Skeleton className="m-5 h-24" />}
      <Table>
        <THead><tr><TH>Employee</TH><TH>Cycle</TH><TH>Self rating</TH><TH>Status</TH><TH /></tr></THead>
        <TBody>
          {active.map((r) => (
            <TR key={r.id}>
              <TD><PersonCell name={r.employee.fullName} src={r.employee.avatarUrl} subtitle={r.employee.designation?.title} /></TD>
              <TD>{r.cycle.name}</TD>
              <TD>{r.selfRating ? <Stars value={r.selfRating} size="h-3.5 w-3.5" /> : <span className="text-xs text-muted-foreground">Not submitted</span>}</TD>
              <TD><StatusBadge status={r.status} /></TD>
              <TD className="text-right"><Button size="sm" variant={r.status === 'MANAGER_REVIEW' ? 'primary' : 'ghost'} onClick={() => setOpen(r.id)}>{r.status === 'MANAGER_REVIEW' ? 'Write review' : 'View'}</Button></TD>
            </TR>
          ))}
        </TBody>
      </Table>
      {!isLoading && !active.length && <EmptyState title="No reviews in an active cycle" />}
      {open && <ReviewForm reviewId={open} as="manager" onClose={() => setOpen(null)} />}
    </Card>
  );
}

function CycleModal({ onClose }: { onClose: () => void }) {
  const save = useSaveCycle();
  const [c, setC] = useState<Partial<ReviewCycle>>({ type: 'HALF_YEARLY', competencies: ['Ownership', 'Collaboration', 'Execution', 'Communication', 'Customer Focus'] });
  return (
    <Modal open onClose={onClose} title="New review cycle" size="lg"
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button loading={save.isPending} onClick={async () => { await save.mutateAsync(c); toast.success('Cycle created as draft'); onClose(); }}>Create</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" required className="sm:col-span-2"><Input value={c.name ?? ''} onChange={(e) => setC({ ...c, name: e.target.value })} placeholder="e.g. Annual Review 2026" /></Field>
        <Field label="Type"><Select value={c.type} onChange={(e) => setC({ ...c, type: e.target.value as ReviewCycle['type'] })} options={[{ value: 'ANNUAL', label: 'Annual' }, { value: 'HALF_YEARLY', label: 'Half-yearly' }, { value: 'QUARTERLY', label: 'Quarterly' }]} /></Field>
        <div />
        <Field label="Period start"><Input type="date" value={c.startDate ?? ''} onChange={(e) => setC({ ...c, startDate: e.target.value })} /></Field>
        <Field label="Period end"><Input type="date" value={c.endDate ?? ''} onChange={(e) => setC({ ...c, endDate: e.target.value })} /></Field>
        <Field label="Self review due"><Input type="date" value={c.selfReviewDue ?? ''} onChange={(e) => setC({ ...c, selfReviewDue: e.target.value })} /></Field>
        <Field label="Manager review due"><Input type="date" value={c.managerReviewDue ?? ''} onChange={(e) => setC({ ...c, managerReviewDue: e.target.value })} /></Field>
        <Field label="Competencies" hint="Comma separated" className="sm:col-span-2"><Input value={(c.competencies ?? []).join(', ')} onChange={(e) => setC({ ...c, competencies: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} /></Field>
      </div>
    </Modal>
  );
}

export function CyclesAdmin() {
  const { data: cycles = [] } = useCycles();
  const [selected, setSelected] = useState<string | null>(null);
  const cycle = cycles.find((c) => c.id === selected) ?? cycles.find((c) => c.status === 'ACTIVE') ?? cycles[0];
  const { data: stats } = useCycleStats(cycle?.id);
  const { data: reviews = [] } = useReviews('all', cycle?.id);
  const launch = useLaunchCycle();
  const save = useSaveCycle();
  const calibrate = useCalibrate();
  const [creating, setCreating] = useState(false);
  const [calibrating, setCalibrating] = useState<PerformanceReview | null>(null);
  const [finalRating, setFinalRating] = useState<number | null>(null);
  const { user } = useAccess();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Select className="w-72" value={cycle?.id ?? ''} onChange={(e) => setSelected(e.target.value)} options={cycles.map((c) => ({ value: c.id, label: `${c.name} (${c.status.toLowerCase()})` }))} />
        {cycle?.status === 'DRAFT' && <Button loading={launch.isPending} onClick={async () => { const r = await launch.mutateAsync(cycle.id); toast.success(`Launched — ${r.reviewsCreated} reviews created`); }}><Rocket className="h-4 w-4" /> Launch cycle</Button>}
        {cycle?.status === 'ACTIVE' && <Button variant="outline" onClick={() => save.mutate({ id: cycle.id, status: 'CALIBRATION' })}>Move to calibration</Button>}
        {cycle?.status === 'CALIBRATION' && <Button variant="outline" onClick={() => save.mutate({ id: cycle.id, status: 'CLOSED' })}>Close cycle</Button>}
        <Button variant="outline" className="ml-auto" onClick={() => setCreating(true)}>New cycle</Button>
      </div>
      {stats && (
        <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
          <div className="grid grid-cols-2 gap-4">
            <StatCard label="Reviews" value={stats.total} />
            <StatCard label="Completed" value={stats.completed} hint={stats.total ? `${Math.round((stats.completed / stats.total) * 100)}%` : undefined} tone="success" />
            <StatCard label="Awaiting self review" value={stats.selfPending} tone="warning" />
            <StatCard label="Awaiting manager" value={stats.managerPending} tone="info" />
          </div>
          <Card>
            <CardHeader title="Rating distribution" description="Final (or manager) ratings — use for calibration" />
            <CardContent><ColumnChart data={stats.distribution.map((d) => ({ rating: RATING_LABELS[d.rating].split(' ')[0] + ` (${d.rating})`, count: d.count }))} xKey="rating" series={[{ key: 'count', name: 'Employees' }]} height={200} /></CardContent>
          </Card>
        </div>
      )}
      <Card>
        <CardHeader title="All reviews" description="Adjust final ratings during calibration" />
        <Table>
          <THead><tr><TH>Employee</TH><TH>Reviewer</TH><TH>Self</TH><TH>Manager</TH><TH>Final</TH><TH>Status</TH><TH /></tr></THead>
          <TBody>
            {reviews.map((r) => (
              <TR key={r.id}>
                <TD><PersonCell name={r.employee.fullName} src={r.employee.avatarUrl} subtitle={r.employee.department?.name} /></TD>
                <TD className="text-muted-foreground">{r.reviewer?.fullName ?? '—'}</TD>
                <TD className="tabular">{r.selfRating ?? '—'}</TD>
                <TD className="tabular">{r.managerRating ?? '—'}</TD>
                <TD className="tabular font-semibold">{r.finalRating ?? '—'}</TD>
                <TD><StatusBadge status={r.status} /></TD>
                <TD className="text-right">{r.status === 'COMPLETED' && user && <Button size="sm" variant="ghost" onClick={() => { setCalibrating(r); setFinalRating(Math.round(r.finalRating ?? 3)); }}>Calibrate</Button>}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
        {!reviews.length && <EmptyState title="No reviews in this cycle yet" />}
      </Card>
      {creating && <CycleModal onClose={() => setCreating(false)} />}
      <Modal open={!!calibrating} onClose={() => setCalibrating(null)} title={`Calibrate — ${calibrating?.employee.fullName}`}
        footer={<><Button variant="outline" onClick={() => setCalibrating(null)}>Cancel</Button><Button loading={calibrate.isPending} onClick={async () => { await calibrate.mutateAsync({ id: calibrating!.id, finalRating: finalRating! }); toast.success('Final rating updated'); setCalibrating(null); }}>Save</Button></>}>
        <div className="flex items-center gap-3"><Stars value={finalRating} onChange={setFinalRating} size="h-6 w-6" /><span className="text-sm text-muted-foreground">{RATING_LABELS[finalRating ?? 0]}</span></div>
      </Modal>
    </div>
  );
}
