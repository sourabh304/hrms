'use client';

import { BarChart3, ClipboardList, HandHeart, Heart, Plus, Trash2, Trophy } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { ColumnChart } from '@/components/charts';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Checkbox, Field, Input, Select, Textarea } from '@/components/ui/form-controls';
import { Modal } from '@/components/ui/modal';
import { Avatar, EmptyState, PageHeader, PageLoader, StatCard } from '@/components/ui/misc';
import { Stars } from '@/components/ui/stars';
import { Tabs } from '@/components/ui/tabs';
import { useAccess } from '@/features/auth/api';
import { PERMISSIONS } from '@/features/auth/types';
import { EmployeePicker } from '@/features/employees/components/employee-picker';
import { cn, formatDate, timeAgo } from '@/lib/utils';
import { BADGES, useCreateSurvey, useGiveKudos, useKudos, useLeaderboard, useLikeKudos, useRespond, useSurveyResults, useSurveys, useSurveyStatus, type Badge, type Survey, type SurveyQuestion } from '../api';

function KudosWall() {
  const { data = [] } = useKudos();
  const { data: board = [] } = useLeaderboard();
  const like = useLikeKudos();
  const { employeeId } = useAccess();
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        {!data.length && <Card><EmptyState icon={HandHeart} title="No kudos yet — be the first!" /></Card>}
        {data.map((k) => {
          const liked = !!employeeId && k.likes.includes(employeeId);
          return (
            <Card key={k.id} className="p-5">
              <div className="flex items-start gap-3">
                <Avatar name={k.from.fullName} src={k.from.avatarUrl} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm"><span className="font-semibold">{k.from.fullName}</span> <span className="text-muted-foreground">recognized</span> <span className="font-semibold">{k.to.fullName}</span></p>
                  <p className="text-xs text-muted-foreground">{timeAgo(k.createdAt)}</p>
                  <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-xs font-medium text-primary-soft-foreground">{BADGES[k.badge].emoji} {BADGES[k.badge].label}</div>
                  <p className="mt-3 text-sm leading-relaxed">{k.message}</p>
                  <button onClick={() => like.mutate(k.id)} className={cn('mt-3 inline-flex cursor-pointer items-center gap-1.5 text-xs', liked ? 'text-rose-500' : 'text-muted-foreground hover:text-rose-500')} aria-pressed={liked}>
                    <Heart className={cn('h-4 w-4', liked && 'fill-current')} /> {k.likes.length}
                  </button>
                </div>
                <Avatar name={k.to.fullName} src={k.to.avatarUrl} size="md" className="ring-2 ring-primary/30" />
              </div>
            </Card>
          );
        })}
      </div>
      <Card className="self-start">
        <CardHeader title="Most recognized" description="Last 90 days" action={<Trophy className="h-4 w-4 text-amber-500" />} />
        <ol className="divide-y divide-border">
          {board.map((b, i) => b.employee && (
            <li key={b.employee.id} className="flex items-center gap-3 px-5 py-2.5">
              <span className={cn('w-5 text-center text-sm font-semibold', i < 3 ? 'text-amber-500' : 'text-muted-foreground')}>{i + 1}</span>
              <Avatar name={b.employee.fullName} src={b.employee.avatarUrl} size="sm" />
              <div className="min-w-0 flex-1"><p className="truncate text-sm">{b.employee.fullName}</p><p className="truncate text-xs text-muted-foreground">{b.employee.designation}</p></div>
              <span className="tabular text-sm font-semibold">{b.count}</span>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}

function GiveKudosModal({ onClose }: { onClose: () => void }) {
  const give = useGiveKudos();
  const [f, setF] = useState<{ toId: string; badge: Badge; message: string }>({ toId: '', badge: 'TEAM_PLAYER', message: '' });
  return (
    <Modal open onClose={onClose} title="Give kudos" description="Public recognition shows on the kudos wall and notifies the recipient."
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button disabled={!f.toId || f.message.length < 5} loading={give.isPending} onClick={async () => { await give.mutateAsync(f); toast.success('Kudos sent 🎉'); onClose(); }}>Send kudos</Button></>}>
      <div className="space-y-4">
        <Field label="Who do you want to recognize?" required><EmployeePicker onChange={(e) => setF({ ...f, toId: e?.id ?? '' })} /></Field>
        <div>
          <p className="mb-2 text-xs font-medium">Badge</p>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(BADGES) as Badge[]).map((b) => (
              <button key={b} type="button" onClick={() => setF({ ...f, badge: b })} className={cn('cursor-pointer rounded-lg border px-2 py-3 text-center text-xs transition-colors', f.badge === b ? 'border-primary bg-primary-soft' : 'border-border hover:bg-muted')}>
                <div className="text-xl">{BADGES[b].emoji}</div>{BADGES[b].label}
              </button>
            ))}
          </div>
        </div>
        <Field label="Message" required><Textarea rows={3} value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} placeholder="What did they do that made a difference?" /></Field>
      </div>
    </Modal>
  );
}

function RespondModal({ survey, onClose }: { survey: Survey; onClose: () => void }) {
  const respond = useRespond();
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const missing = survey.questions.filter((q) => q.required && (answers[q.id] === undefined || answers[q.id] === ''));
  return (
    <Modal open onClose={onClose} size="lg" title={survey.title} description={survey.isAnonymous ? '🔒 Anonymous — your identity is never stored with your answers.' : undefined}
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button disabled={!!missing.length} loading={respond.isPending} onClick={async () => { await respond.mutateAsync({ id: survey.id, answers }); toast.success('Thanks for sharing your feedback!'); onClose(); }}>Submit</Button></>}>
      <div className="space-y-6">
        {survey.questions.map((q, i) => (
          <div key={q.id}>
            <p className="mb-2 text-sm font-medium">{i + 1}. {q.text}{q.required && <span className="text-danger"> *</span>}</p>
            {q.type === 'ENPS' && (
              <div>
                <div className="grid grid-cols-11 gap-1">
                  {Array.from({ length: 11 }, (_, n) => (
                    <button key={n} type="button" onClick={() => setAnswers({ ...answers, [q.id]: n })} className={cn('cursor-pointer rounded-md border py-2 text-sm', answers[q.id] === n ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:bg-muted')}>{n}</button>
                  ))}
                </div>
                <div className="mt-1 flex justify-between text-[11px] text-muted-foreground"><span>Not at all likely</span><span>Extremely likely</span></div>
              </div>
            )}
            {q.type === 'RATING' && <Stars value={(answers[q.id] as number) ?? null} onChange={(n) => setAnswers({ ...answers, [q.id]: n })} size="h-7 w-7" />}
            {q.type === 'CHOICE' && <Select placeholder="Select an option" value={String(answers[q.id] ?? '')} onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })} options={(q.options ?? []).map((o) => ({ value: o, label: o }))} />}
            {q.type === 'TEXT' && <Textarea rows={3} value={String(answers[q.id] ?? '')} onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })} />}
          </div>
        ))}
      </div>
    </Modal>
  );
}

function ResultsModal({ id, onClose }: { id: string; onClose: () => void }) {
  const { data, isLoading } = useSurveyResults(id);
  return (
    <Modal open onClose={onClose} size="xl" title={data?.survey.title ?? 'Results'}>
      {isLoading || !data ? <PageLoader /> : (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <StatCard label="Responses" value={data.totalResponses} />
            <StatCard label="Response rate" value={`${data.responseRate}%`} tone="info" />
            <StatCard label="eNPS" value={data.questions.find((q) => q.type === 'ENPS')?.enps ?? '—'} tone="success" hint="Promoters − detractors" />
          </div>
          {data.questions.map((q) => (
            <Card key={q.id}>
              <CardHeader title={q.text} description={`${q.responses} responses${q.average != null ? ` · average ${q.average}` : ''}`} />
              <CardContent>
                {q.distribution && <ColumnChart data={q.distribution} xKey="option" series={[{ key: 'count', name: 'Responses' }]} height={170} />}
                {q.comments && (q.comments.filter(Boolean).length ? <ul className="space-y-2">{q.comments.filter(Boolean).map((c, i) => <li key={i} className="rounded-lg bg-muted px-3 py-2 text-sm">“{c}”</li>)}</ul> : <p className="text-sm text-muted-foreground">No comments.</p>)}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </Modal>
  );
}

function NewSurveyModal({ onClose }: { onClose: () => void }) {
  const create = useCreateSurvey();
  const [s, setS] = useState({ title: '', description: '', isAnonymous: true, closesOn: '' });
  const [questions, setQuestions] = useState<Omit<SurveyQuestion, 'id'>[]>([{ text: 'How likely are you to recommend us as a place to work?', type: 'ENPS', required: true }]);
  const setQ = (i: number, patch: Partial<SurveyQuestion>) => setQuestions(questions.map((q, j) => (j === i ? { ...q, ...patch } : q)));
  return (
    <Modal open onClose={onClose} size="lg" title="New pulse survey"
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button disabled={!s.title || !questions.length} loading={create.isPending} onClick={async () => { await create.mutateAsync({ ...s, closesOn: s.closesOn || undefined, questions }); toast.success('Survey saved as draft — launch it when ready'); onClose(); }}>Save draft</Button></>}>
      <div className="space-y-4">
        <Field label="Title" required><Input value={s.title} onChange={(e) => setS({ ...s, title: e.target.value })} /></Field>
        <Field label="Description"><Input value={s.description} onChange={(e) => setS({ ...s, description: e.target.value })} /></Field>
        <div className="flex items-center gap-6"><Checkbox label="Anonymous responses" checked={s.isAnonymous} onChange={(e) => setS({ ...s, isAnonymous: e.target.checked })} /><Field label="Closes on"><Input type="date" value={s.closesOn} onChange={(e) => setS({ ...s, closesOn: e.target.value })} /></Field></div>
        <div className="space-y-2">
          <p className="text-sm font-semibold">Questions</p>
          {questions.map((q, i) => (
            <div key={i} className="grid grid-cols-[1fr_120px_32px] gap-2">
              <Input value={q.text} onChange={(e) => setQ(i, { text: e.target.value })} placeholder="Question" />
              <Select value={q.type} onChange={(e) => setQ(i, { type: e.target.value as SurveyQuestion['type'] })} options={[{ value: 'ENPS', label: 'eNPS (0–10)' }, { value: 'RATING', label: 'Rating (1–5)' }, { value: 'CHOICE', label: 'Choice' }, { value: 'TEXT', label: 'Free text' }]} />
              <Button variant="ghost" size="icon-sm" onClick={() => setQuestions(questions.filter((_, j) => j !== i))} aria-label="Remove question"><Trash2 className="h-3.5 w-3.5" /></Button>
              {q.type === 'CHOICE' && <Input className="col-span-3" placeholder="Options, comma separated" value={(q.options ?? []).join(', ')} onChange={(e) => setQ(i, { options: e.target.value.split(',').map((o) => o.trim()).filter(Boolean) })} />}
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => setQuestions([...questions, { text: '', type: 'RATING', required: false }])}><Plus className="h-3.5 w-3.5" /> Add question</Button>
        </div>
      </div>
    </Modal>
  );
}

function Surveys() {
  const { can } = useAccess();
  const manage = can(PERMISSIONS.ENGAGEMENT_MANAGE);
  const { data = [] } = useSurveys();
  const status = useSurveyStatus();
  const [responding, setResponding] = useState<Survey | null>(null);
  const [results, setResults] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  return (
    <>
      {manage && <div className="mb-4 flex justify-end"><Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> New survey</Button></div>}
      {!data.length && <Card><EmptyState icon={ClipboardList} title="No active surveys" /></Card>}
      <div className="grid gap-4 md:grid-cols-2">
        {data.map((s) => (
          <Card key={s.id} className="flex flex-col p-5">
            <div className="flex items-start justify-between gap-3"><p className="font-semibold">{s.title}</p><StatusBadge status={s.status} /></div>
            <p className="mt-1 flex-1 text-sm text-muted-foreground">{s.description}</p>
            <p className="mt-3 text-xs text-muted-foreground">{s.questions.length} questions · {s.isAnonymous ? 'anonymous' : 'attributed'}{s.closesOn && ` · closes ${formatDate(s.closesOn)}`}{manage && ` · ${s.responseCount} responses`}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {s.status === 'ACTIVE' && (s.hasResponded ? <StatusBadge status="COMPLETED" label="You responded" /> : <Button size="sm" onClick={() => setResponding(s)}>Take survey</Button>)}
              {manage && <Button size="sm" variant="outline" onClick={() => setResults(s.id)}><BarChart3 className="h-3.5 w-3.5" /> Results</Button>}
              {manage && s.status === 'DRAFT' && <Button size="sm" variant="secondary" onClick={() => status.mutate({ id: s.id, status: 'ACTIVE' })}>Launch</Button>}
              {manage && s.status === 'ACTIVE' && <Button size="sm" variant="ghost" onClick={() => status.mutate({ id: s.id, status: 'CLOSED' })}>Close</Button>}
            </div>
          </Card>
        ))}
      </div>
      {responding && <RespondModal survey={responding} onClose={() => setResponding(null)} />}
      {results && <ResultsModal id={results} onClose={() => setResults(null)} />}
      {creating && <NewSurveyModal onClose={() => setCreating(false)} />}
    </>
  );
}

export function EngagementPage() {
  const params = useSearchParams();
  const router = useRouter();
  const [tab, setTab] = useState(params.get('tab') ?? 'kudos');
  const [giving, setGiving] = useState(params.get('kudos') === '1');
  return (
    <>
      <PageHeader title="Engagement" description="Celebrate great work and share how you feel." actions={<Button onClick={() => setGiving(true)}><HandHeart className="h-4 w-4" /> Give kudos</Button>} />
      <Tabs className="mb-6" value={tab} onChange={setTab} tabs={[{ value: 'kudos', label: 'Kudos wall' }, { value: 'surveys', label: 'Pulse surveys' }]} />
      {tab === 'kudos' && <KudosWall />}
      {tab === 'surveys' && <Surveys />}
      {giving && <GiveKudosModal onClose={() => { setGiving(false); if (params.get('kudos')) router.replace('/engagement'); }} />}
    </>
  );
}
