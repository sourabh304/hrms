'use client';

import { Flag, Pencil, Plus, Target, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field, Input, Select, Textarea } from '@/components/ui/form-controls';
import { Modal } from '@/components/ui/modal';
import { EmptyState, PersonCell, Progress, Skeleton } from '@/components/ui/misc';
import { enumOptions } from '@/lib/options';
import { formatDate, humanize } from '@/lib/utils';
import { useCycles, useDeleteGoal, useGoals, useSaveGoal, type Goal, type KeyResult } from '../api';

const tone = (s: Goal['status']) => (s === 'AT_RISK' ? 'warning' : s === 'OFF_TRACK' ? 'danger' : s === 'COMPLETED' ? 'success' : 'primary');

export function GoalModal({ goal, onClose, company }: { goal: Partial<Goal>; onClose: () => void; company?: boolean }) {
  const save = useSaveGoal();
  const { data: cycles = [] } = useCycles();
  const { data: companyGoals = [] } = useGoals('company');
  const [g, setG] = useState<Partial<Goal>>({ category: company ? 'COMPANY' : 'INDIVIDUAL', weight: 50, keyResults: [{ title: '', target: 100, current: 0, unit: '%' }], cycleId: cycles.find((c) => c.status === 'ACTIVE')?.id ?? null, ...goal });
  const krs = g.keyResults ?? [];
  const setKr = (i: number, patch: Partial<KeyResult>) => setG({ ...g, keyResults: krs.map((k, j) => (j === i ? { ...k, ...patch } : k)) });

  return (
    <Modal open onClose={onClose} title={g.id ? 'Update goal' : company ? 'New company goal' : 'New goal'} size="lg"
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button loading={save.isPending} onClick={async () => {
        if (!g.title) return toast.error('Give the goal a title');
        await save.mutateAsync({
          id: g.id, title: g.title, description: g.description || undefined, category: g.category, weight: Number(g.weight ?? 0),
          dueDate: g.dueDate || undefined, cycleId: g.cycleId || undefined, parentGoalId: g.parentGoalId || undefined,
          ...(g.employeeId && !g.id ? { employeeId: g.employeeId } : {}),
          ...(g.id ? { status: g.status } : {}),
          keyResults: krs.filter((k) => k.title).map((k) => ({ ...k, target: Number(k.target), current: Number(k.current) })),
        });
        toast.success('Goal saved');
        onClose();
      }}>Save</Button></>}>
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Objective" required className="sm:col-span-2"><Input value={g.title ?? ''} onChange={(e) => setG({ ...g, title: e.target.value })} placeholder="What do you want to achieve?" /></Field>
          <Field label="Description" className="sm:col-span-2"><Textarea rows={2} value={g.description ?? ''} onChange={(e) => setG({ ...g, description: e.target.value })} /></Field>
          {!company && <Field label="Category"><Select value={g.category} onChange={(e) => setG({ ...g, category: e.target.value as Goal['category'] })} options={enumOptions(['INDIVIDUAL', 'TEAM', 'DEVELOPMENT'])} /></Field>}
          {!company && <Field label="Aligns to company goal"><Select placeholder="None" value={g.parentGoalId ?? ''} onChange={(e) => setG({ ...g, parentGoalId: e.target.value || null })} options={companyGoals.map((c) => ({ value: c.id, label: c.title }))} /></Field>}
          <Field label="Review cycle"><Select placeholder="None" value={g.cycleId ?? ''} onChange={(e) => setG({ ...g, cycleId: e.target.value || null })} options={cycles.map((c) => ({ value: c.id, label: c.name }))} /></Field>
          <Field label="Due date"><Input type="date" value={g.dueDate ?? ''} onChange={(e) => setG({ ...g, dueDate: e.target.value })} /></Field>
          {!company && <Field label="Weight (%)"><Input type="number" min={0} max={100} value={g.weight ?? 0} onChange={(e) => setG({ ...g, weight: Number(e.target.value) })} /></Field>}
          {g.id && <Field label="Status"><Select value={g.status} onChange={(e) => setG({ ...g, status: e.target.value as Goal['status'] })} options={enumOptions(['NOT_STARTED', 'ON_TRACK', 'AT_RISK', 'OFF_TRACK', 'COMPLETED'])} /></Field>}
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold">Key results</p>
          <div className="space-y-2">
            <div className="grid grid-cols-[1fr_90px_90px_70px_32px] gap-2 text-[11px] font-medium text-muted-foreground"><span>Key result</span><span>Current</span><span>Target</span><span>Unit</span><span /></div>
            {krs.map((k, i) => (
              <div key={k.id ?? i} className="grid grid-cols-[1fr_90px_90px_70px_32px] items-center gap-2">
                <Input value={k.title} onChange={(e) => setKr(i, { title: e.target.value })} placeholder="Measurable outcome" />
                <Input type="number" value={k.current} onChange={(e) => setKr(i, { current: Number(e.target.value) })} />
                <Input type="number" value={k.target} onChange={(e) => setKr(i, { target: Number(e.target.value) })} />
                <Input value={k.unit} onChange={(e) => setKr(i, { unit: e.target.value })} />
                <Button variant="ghost" size="icon-sm" onClick={() => setG({ ...g, keyResults: krs.filter((_, j) => j !== i) })} aria-label="Remove key result"><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            ))}
          </div>
          <Button variant="outline" size="sm" className="mt-2" onClick={() => setG({ ...g, keyResults: [...krs, { title: '', target: 100, current: 0, unit: '%' }] })}><Plus className="h-3.5 w-3.5" /> Add key result</Button>
          <p className="mt-2 text-xs text-muted-foreground">Progress is calculated automatically from key results.</p>
        </div>
      </div>
    </Modal>
  );
}

export function GoalCard({ goal, showOwner, onEdit, onDelete }: { goal: Goal; showOwner?: boolean; onEdit?: () => void; onDelete?: () => void }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
            <Badge variant={goal.category === 'COMPANY' ? 'primary' : 'neutral'}>{humanize(goal.category)}</Badge>
            <StatusBadge status={goal.status} />
            {goal.weight > 0 && <span className="text-[11px] text-muted-foreground">weight {goal.weight}%</span>}
          </div>
          <p className="font-semibold">{goal.title}</p>
          {goal.parentGoal && <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Flag className="h-3 w-3" /> Aligned to: {goal.parentGoal.title}</p>}
          {showOwner && goal.employee && <div className="mt-2"><PersonCell name={goal.employee.fullName} src={goal.employee.avatarUrl} subtitle={goal.employee.designation?.title} size="xs" /></div>}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {onEdit && <Button variant="ghost" size="icon-sm" onClick={onEdit} aria-label="Edit goal"><Pencil className="h-3.5 w-3.5" /></Button>}
          {onDelete && <Button variant="ghost" size="icon-sm" onClick={onDelete} aria-label="Delete goal"><Trash2 className="h-3.5 w-3.5" /></Button>}
        </div>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <Progress value={goal.progress} tone={tone(goal.status)} className="h-2" />
        <span className="tabular w-10 text-right text-sm font-semibold">{goal.progress}%</span>
      </div>
      <ul className="mt-4 space-y-2.5">
        {goal.keyResults.map((k, i) => (
          <li key={k.id ?? i} className="text-sm">
            <div className="flex justify-between gap-3"><span className="text-muted-foreground">{k.title}</span><span className="tabular shrink-0 text-xs font-medium">{k.current} / {k.target} {k.unit}</span></div>
            <Progress value={k.target ? (k.current / k.target) * 100 : 0} className="mt-1 h-1" />
          </li>
        ))}
      </ul>
      {goal.dueDate && <p className="mt-3 text-xs text-muted-foreground">Due {formatDate(goal.dueDate)}</p>}
    </Card>
  );
}

export function GoalsGrid({ scope, editable }: { scope: 'me' | 'team' | 'all' | 'company'; editable: boolean }) {
  const { data = [], isLoading } = useGoals(scope);
  const remove = useDeleteGoal();
  const [editing, setEditing] = useState<Partial<Goal> | null>(null);

  if (isLoading) return <Skeleton className="h-64" />;
  return (
    <>
      {editable && (
        <div className="mb-4 flex justify-end">
          <Button onClick={() => setEditing({})}><Plus className="h-4 w-4" /> {scope === 'company' ? 'Company goal' : 'New goal'}</Button>
        </div>
      )}
      {!data.length && <Card><EmptyState icon={Target} title="No goals yet" description="Set objectives with measurable key results and align them to company goals." /></Card>}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data.map((g) => (
          <GoalCard
            key={g.id}
            goal={g}
            showOwner={scope === 'team' || scope === 'all'}
            onEdit={editable || scope === 'team' ? () => setEditing(g) : undefined}
            onDelete={editable ? async () => { await remove.mutateAsync(g.id); toast.success('Goal deleted'); } : undefined}
          />
        ))}
      </div>
      {editing && <GoalModal goal={editing} company={scope === 'company'} onClose={() => setEditing(null)} />}
    </>
  );
}
