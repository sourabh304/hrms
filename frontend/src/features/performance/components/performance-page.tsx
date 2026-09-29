'use client';

import { MessageSquarePlus, ThumbsUp, TrendingUp } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field, Select, Textarea } from '@/components/ui/form-controls';
import { Modal } from '@/components/ui/modal';
import { EmptyState, PageHeader, PersonCell } from '@/components/ui/misc';
import { Segmented, Tabs } from '@/components/ui/tabs';
import { useAccess } from '@/features/auth/api';
import { PERMISSIONS } from '@/features/auth/types';
import { EmployeePicker } from '@/features/employees/components/employee-picker';
import { timeAgo } from '@/lib/utils';
import { useFeedback, useGiveFeedback } from '../api';
import { GoalsGrid } from './goals';
import { CyclesAdmin, MyReviews, TeamReviews } from './reviews';

function FeedbackTab() {
  const { isManager } = useAccess();
  const [direction, setDirection] = useState<'received' | 'given' | 'team'>('received');
  const { data = [] } = useFeedback(direction);
  const give = useGiveFeedback();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ toId: '', message: '', type: 'PRAISE', visibility: 'SHARED_WITH_MANAGER' });

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <Segmented value={direction} onChange={(v) => setDirection(v as typeof direction)} options={[{ value: 'received', label: 'Received' }, { value: 'given', label: 'Given' }, ...(isManager ? [{ value: 'team', label: 'My team' }] : [])]} />
        <Button onClick={() => setOpen(true)}><MessageSquarePlus className="h-4 w-4" /> Give feedback</Button>
      </div>
      {!data.length && <Card><EmptyState icon={ThumbsUp} title="No feedback yet" description="Continuous feedback helps everyone grow — start a conversation." /></Card>}
      <div className="grid gap-4 md:grid-cols-2">
        {data.map((fb) => (
          <Card key={fb.id} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <PersonCell name={direction === 'given' ? fb.to.fullName : fb.from.fullName} src={(direction === 'given' ? fb.to : fb.from).avatarUrl} subtitle={direction === 'team' ? `to ${fb.to.fullName}` : (direction === 'given' ? fb.to : fb.from).designation?.title} />
              <Badge variant={fb.type === 'PRAISE' ? 'success' : 'info'}>{fb.type === 'PRAISE' ? 'Praise' : 'Constructive'}</Badge>
            </div>
            <p className="mt-3 text-sm leading-relaxed">{fb.message}</p>
            <p className="mt-3 text-xs text-muted-foreground">{timeAgo(fb.createdAt)}{fb.visibility === 'PRIVATE' && ' · private'}</p>
          </Card>
        ))}
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title="Give feedback"
        footer={<><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button loading={give.isPending} disabled={!f.toId || f.message.length < 5} onClick={async () => { await give.mutateAsync(f); toast.success('Feedback sent'); setOpen(false); setF({ ...f, toId: '', message: '' }); }}>Send</Button></>}>
        <div className="space-y-4">
          <Field label="To" required><EmployeePicker onChange={(e) => setF({ ...f, toId: e?.id ?? '' })} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Type"><Select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} options={[{ value: 'PRAISE', label: 'Praise' }, { value: 'CONSTRUCTIVE', label: 'Constructive' }]} /></Field>
            <Field label="Visibility"><Select value={f.visibility} onChange={(e) => setF({ ...f, visibility: e.target.value })} options={[{ value: 'SHARED_WITH_MANAGER', label: 'Recipient & their manager' }, { value: 'PRIVATE', label: 'Recipient only' }]} /></Field>
          </div>
          <Field label="Message" required hint="Be specific: situation, behaviour, impact"><Textarea rows={4} value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} /></Field>
        </div>
      </Modal>
    </>
  );
}

export function PerformancePage() {
  const params = useSearchParams();
  const { can, isManager } = useAccess();
  const admin = can(PERMISSIONS.PERFORMANCE_MANAGE);
  const [tab, setTab] = useState(params.get('tab') ?? 'goals');

  return (
    <>
      <PageHeader title="Performance" description="Goals, reviews and continuous feedback." actions={<Badge variant="primary"><TrendingUp className="h-3 w-3" /> OKRs aligned to company goals</Badge>} />
      <Tabs className="mb-6" value={tab} onChange={setTab} tabs={[
        { value: 'goals', label: 'My goals' },
        { value: 'team-goals', label: 'Team goals', hidden: !isManager },
        { value: 'company', label: 'Company goals' },
        { value: 'reviews', label: 'My reviews' },
        { value: 'team-reviews', label: 'Team reviews', hidden: !isManager },
        { value: 'feedback', label: 'Feedback' },
        { value: 'cycles', label: 'Review cycles', hidden: !admin },
      ]} />
      {tab === 'goals' && <GoalsGrid scope="me" editable />}
      {tab === 'team-goals' && <GoalsGrid scope="team" editable={false} />}
      {tab === 'company' && <GoalsGrid scope="company" editable={admin} />}
      {tab === 'reviews' && <MyReviews />}
      {tab === 'team-reviews' && <TeamReviews />}
      {tab === 'feedback' && <FeedbackTab />}
      {tab === 'cycles' && <CyclesAdmin />}
    </>
  );
}
