'use client';

import { ListChecks, Plus, Rocket, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox, Field, Input, Select, Textarea } from '@/components/ui/form-controls';
import { Modal } from '@/components/ui/modal';
import { EmptyState, PageHeader, PersonCell, Progress, Skeleton, StatCard } from '@/components/ui/misc';
import { Segmented, Tabs } from '@/components/ui/tabs';
import { useAccess } from '@/features/auth/api';
import { PERMISSIONS } from '@/features/auth/types';
import { EmployeePicker } from '@/features/employees/components/employee-picker';
import { cn, formatDate, humanize, todayISO } from '@/lib/utils';
import { useDeleteTemplate, useJourneys, useSaveTemplate, useStartJourney, useTemplates, type JourneyTemplate, type JourneyType, type TemplateTask } from '../api';
import { JourneyChecklist } from './journey-card';

function JourneysBoard({ type }: { type: JourneyType }) {
  const [status, setStatus] = useState('IN_PROGRESS');
  const { data = [], isLoading } = useJourneys(type, status || undefined);
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = data.find((j) => j.id === activeId) ?? data[0];

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
      <Card className="self-start">
        <div className="border-b border-border p-3">
          <Segmented value={status} onChange={setStatus} options={[{ value: 'IN_PROGRESS', label: 'In progress' }, { value: 'COMPLETED', label: 'Completed' }, { value: '', label: 'All' }]} />
        </div>
        {isLoading && <Skeleton className="m-4 h-32" />}
        {!isLoading && !data.length && <EmptyState icon={Rocket} title={`No ${type.toLowerCase()} journeys`} />}
        <ul className="divide-y divide-border">
          {data.map((j) => (
            <li key={j.id}>
              <button onClick={() => setActiveId(j.id)} className={cn('w-full cursor-pointer px-4 py-3 text-left hover:bg-muted/50', active?.id === j.id && 'bg-primary-soft/50')}>
                <PersonCell name={j.employee.fullName} src={j.employee.avatarUrl} subtitle={`${type === 'ONBOARDING' ? 'Joins' : 'Last day'} ${formatDate(j.startDate)}`} />
                <div className="mt-2 flex items-center gap-2">
                  <Progress value={j.progress} tone={j.progress === 100 ? 'success' : 'primary'} />
                  <span className="tabular text-[11px] text-muted-foreground">{j.progress}%</span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </Card>
      {active ? <JourneyChecklist journey={active} /> : <Card><EmptyState icon={ListChecks} title="Select a journey" /></Card>}
    </div>
  );
}

function TemplatesAdmin() {
  const { data = [] } = useTemplates();
  const save = useSaveTemplate();
  const remove = useDeleteTemplate();
  const [editing, setEditing] = useState<Partial<JourneyTemplate> | null>(null);
  const tasks = editing?.tasks ?? [];
  const setTask = (i: number, patch: Partial<TemplateTask>) => setEditing({ ...editing, tasks: tasks.map((t, j) => (j === i ? { ...t, ...patch } : t)) });

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data.map((t) => (
          <Card key={t.id} className="flex flex-col p-5">
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold">{t.name}</p>
              <div className="flex gap-1">{t.isDefault && <Badge variant="success">Default</Badge>}<Badge variant="primary">{humanize(t.type)}</Badge></div>
            </div>
            <p className="mt-1 flex-1 text-sm text-muted-foreground">{t.description}</p>
            <p className="mt-3 text-xs text-muted-foreground">{t.tasks.length} tasks · {[...new Set(t.tasks.map((x) => x.assignee))].map(humanize).join(', ')}</p>
            <div className="mt-4 flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setEditing(t)}>Edit</Button>
              <Button size="sm" variant="ghost" onClick={async () => { await remove.mutateAsync(t.id); toast.success('Template deleted'); }}><Trash2 className="h-3.5 w-3.5" /></Button>
            </div>
          </Card>
        ))}
        <button onClick={() => setEditing({ type: 'ONBOARDING', tasks: [{ title: '', category: 'General', assignee: 'HR', dueOffsetDays: 0 }] })} className="flex min-h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-input text-sm text-muted-foreground hover:border-primary hover:text-foreground">
          <Plus className="h-5 w-5" /> New template
        </button>
      </div>
      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? 'Edit template' : 'New template'} size="xl"
        footer={<><Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button><Button loading={save.isPending} onClick={async () => {
          const e = editing!;
          await save.mutateAsync({ id: e.id, name: e.name, type: e.type, description: e.description ?? undefined, isDefault: e.isDefault, tasks: tasks.filter((t) => t.title).map((t) => ({ ...t, dueOffsetDays: Number(t.dueOffsetDays) })) });
          toast.success('Template saved');
          setEditing(null);
        }}>Save template</Button></>}>
        {editing && (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Name" required className="sm:col-span-2"><Input value={editing.name ?? ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></Field>
              <Field label="Type"><Select value={editing.type} onChange={(e) => setEditing({ ...editing, type: e.target.value as JourneyType })} options={[{ value: 'ONBOARDING', label: 'Onboarding' }, { value: 'OFFBOARDING', label: 'Offboarding' }]} /></Field>
              <Field label="Description" className="sm:col-span-3"><Textarea rows={2} value={editing.description ?? ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></Field>
              <Checkbox label="Use as the default template for this type" checked={!!editing.isDefault} onChange={(e) => setEditing({ ...editing, isDefault: e.target.checked })} />
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold">Tasks</p>
              <div className="space-y-2">
                {tasks.map((t, i) => (
                  <div key={i} className="grid grid-cols-[1fr_140px_120px_90px_32px] items-center gap-2">
                    <Input placeholder="Task" value={t.title} onChange={(e) => setTask(i, { title: e.target.value })} />
                    <Input placeholder="Category" value={t.category} onChange={(e) => setTask(i, { category: e.target.value })} />
                    <Select value={t.assignee} onChange={(e) => setTask(i, { assignee: e.target.value as TemplateTask['assignee'] })} options={['HR', 'IT', 'FINANCE', 'MANAGER', 'EMPLOYEE'].map((a) => ({ value: a, label: humanize(a) }))} />
                    <Input type="number" title="Days from start" value={t.dueOffsetDays} onChange={(e) => setTask(i, { dueOffsetDays: Number(e.target.value) })} />
                    <Button variant="ghost" size="icon-sm" onClick={() => setEditing({ ...editing, tasks: tasks.filter((_, j) => j !== i) })} aria-label="Remove task"><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => setEditing({ ...editing, tasks: [...tasks, { title: '', category: 'General', assignee: 'HR', dueOffsetDays: 0 }] })}><Plus className="h-3.5 w-3.5" /> Add task</Button>
              <p className="mt-2 text-xs text-muted-foreground">Due offset = days relative to the joining date (onboarding) or last working day (offboarding). Negative values are before.</p>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

function StartJourneyModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const start = useStartJourney();
  const { data: templates = [] } = useTemplates();
  const [f, setF] = useState({ employeeId: '', templateId: '', startDate: todayISO() });
  const template = templates.find((t) => t.id === f.templateId);
  return (
    <Modal open={open} onClose={onClose} title="Start a journey"
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button disabled={!f.employeeId || !template} loading={start.isPending} onClick={async () => {
        await start.mutateAsync({ employeeId: f.employeeId, templateId: f.templateId, type: template!.type, startDate: f.startDate });
        toast.success('Journey started — assignees notified');
        onClose();
      }}>Start</Button></>}>
      <div className="space-y-4">
        <Field label="Employee" required><EmployeePicker onChange={(e) => setF({ ...f, employeeId: e?.id ?? '' })} /></Field>
        <Field label="Template" required><Select placeholder="Select template" value={f.templateId} onChange={(e) => setF({ ...f, templateId: e.target.value })} options={templates.map((t) => ({ value: t.id, label: `${t.name} (${humanize(t.type)})` }))} /></Field>
        <Field label="Start date" hint="Joining date or last working day"><Input type="date" value={f.startDate} onChange={(e) => setF({ ...f, startDate: e.target.value })} /></Field>
      </div>
    </Modal>
  );
}

export function OnboardingPage() {
  const { can } = useAccess();
  const manage = can(PERMISSIONS.ONBOARDING_MANAGE);
  const [tab, setTab] = useState('onboarding');
  const [startOpen, setStartOpen] = useState(false);
  const { data: active = [] } = useJourneys(undefined, 'IN_PROGRESS');
  const today = todayISO();
  const overdue = active.flatMap((j) => j.tasks).filter((t) => t.status === 'PENDING' && t.dueDate < today).length;

  return (
    <>
      <PageHeader title="Onboarding & journeys" description="Guided checklists that coordinate HR, IT, Finance, managers and new hires." actions={manage && <Button onClick={() => setStartOpen(true)}><Plus className="h-4 w-4" /> Start journey</Button>} />
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Active onboardings" value={active.filter((j) => j.type === 'ONBOARDING').length} icon={Rocket} />
        <StatCard label="Active offboardings" value={active.filter((j) => j.type === 'OFFBOARDING').length} tone="warning" />
        <StatCard label="Open tasks" value={active.reduce((s, j) => s + j.totalTasks - j.completedTasks, 0)} tone="info" />
        <StatCard label="Overdue tasks" value={overdue} tone="danger" />
      </div>
      <Tabs className="mb-6" value={tab} onChange={setTab} tabs={[
        { value: 'onboarding', label: 'Onboarding' },
        { value: 'offboarding', label: 'Offboarding' },
        { value: 'templates', label: 'Templates', hidden: !manage },
      ]} />
      {tab === 'onboarding' && <JourneysBoard type="ONBOARDING" />}
      {tab === 'offboarding' && <JourneysBoard type="OFFBOARDING" />}
      {tab === 'templates' && <TemplatesAdmin />}
      {startOpen && <StartJourneyModal open={startOpen} onClose={() => setStartOpen(false)} />}
      {!manage && <p className="mt-4 text-xs text-muted-foreground">You see journeys for yourself and your direct reports.</p>}
    </>
  );
}
