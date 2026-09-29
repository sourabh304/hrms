'use client';

import { AlertTriangle, BookOpen, CheckCircle2, Clock, GraduationCap, MonitorPlay, Plus, Search, ShieldCheck, UserPlus, Users } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { Checkbox, Field, Input, Select, Textarea } from '@/components/ui/form-controls';
import { Modal } from '@/components/ui/modal';
import { EmptyState, PageHeader, PersonCell, Progress, Skeleton, StatCard } from '@/components/ui/misc';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { Tabs } from '@/components/ui/tabs';
import { useAccess } from '@/features/auth/api';
import { PERMISSIONS } from '@/features/auth/types';
import { EmployeePicker } from '@/features/employees/components/employee-picker';
import type { LookupEmployee } from '@/features/employees/types';
import { useDepartments } from '@/features/organization/api';
import { enumOptions } from '@/lib/options';
import { cn, formatDate, humanize, todayISO } from '@/lib/utils';
import { useAssignCourse, useCategories, useCourseEnrollments, useCourses, useEnroll, useLearningStats, useMyLearning, useSaveCourse, useUpdateProgress, type Course, type Enrollment } from '../api';

const CATEGORY_GRADIENT: Record<string, string> = {
  Compliance: 'from-rose-500 to-orange-400',
  Leadership: 'from-violet-600 to-indigo-500',
  Technical: 'from-sky-600 to-cyan-400',
  'Soft Skills': 'from-emerald-600 to-teal-400',
  Sales: 'from-amber-500 to-yellow-400',
  Product: 'from-fuchsia-600 to-pink-400',
};

function ProgressModal({ enrollment, onClose }: { enrollment: Enrollment; onClose: () => void }) {
  const update = useUpdateProgress();
  const [progress, setProgress] = useState(enrollment.progress);
  return (
    <Modal open onClose={onClose} title={enrollment.course?.title ?? 'Course'} description="Update your progress"
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button loading={update.isPending} onClick={async () => { await update.mutateAsync({ id: enrollment.id, progress }); toast.success(progress === 100 ? 'Course completed 🎓' : 'Progress saved'); onClose(); }}>Save</Button></>}>
      <div className="space-y-4">
        {enrollment.course?.contentUrl && <a href={enrollment.course.contentUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-primary hover:underline"><MonitorPlay className="h-4 w-4" /> Open course content</a>}
        <div className="flex items-center gap-4">
          <input type="range" min={0} max={100} step={10} value={progress} onChange={(e) => setProgress(Number(e.target.value))} className="flex-1 accent-primary" aria-label="Progress" />
          <span className="tabular w-12 text-right text-lg font-semibold">{progress}%</span>
        </div>
      </div>
    </Modal>
  );
}

function CourseCard({ c, canManage, onAssign, onRoster }: { c: Course; canManage: boolean; onAssign: () => void; onRoster: () => void }) {
  const enroll = useEnroll();
  const mine = c.myEnrollment;
  return (
    <Card className="flex flex-col overflow-hidden">
      <div className={cn('flex h-24 items-end bg-gradient-to-br p-4', CATEGORY_GRADIENT[c.category] ?? 'from-slate-600 to-slate-400')}>
        <div className="flex gap-1.5">
          {c.isMandatory && <span className="rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700">MANDATORY</span>}
          <span className="rounded bg-black/25 px-1.5 py-0.5 text-[10px] font-medium text-white">{c.category}</span>
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <p className="font-semibold leading-snug">{c.title}</p>
        <p className="mt-1 text-xs text-muted-foreground">{c.provider} · {c.durationHours}h · {humanize(c.level)} · {humanize(c.format)}</p>
        <p className="mt-2 line-clamp-2 flex-1 text-sm text-muted-foreground">{c.description}</p>
        {mine && <div className="mt-3"><div className="mb-1 flex justify-between text-xs"><StatusBadge status={mine.status} /><span className="tabular">{mine.progress}%</span></div><Progress value={mine.progress} tone={mine.status === 'COMPLETED' ? 'success' : 'primary'} /></div>}
        <div className="mt-4 flex gap-2">
          {!mine || mine.status === 'DROPPED' ? (
            <Button size="sm" className="flex-1" loading={enroll.isPending} onClick={async () => { await enroll.mutateAsync(c.id); toast.success(`Enrolled in ${c.title}`); }}>Enroll</Button>
          ) : (
            <span className="flex-1 text-xs text-muted-foreground">{c.enrolledCount} enrolled · {c.completedCount} completed</span>
          )}
          {canManage && <Button size="icon-sm" variant="outline" onClick={onRoster} aria-label="View enrollments"><Users className="h-3.5 w-3.5" /></Button>}
          <Button size="icon-sm" variant="outline" onClick={onAssign} aria-label="Assign course"><UserPlus className="h-3.5 w-3.5" /></Button>
        </div>
      </div>
    </Card>
  );
}

function AssignModal({ course, onClose }: { course: Course; onClose: () => void }) {
  const assign = useAssignCourse();
  const { can } = useAccess();
  const { data: departments = [] } = useDepartments();
  const [people, setPeople] = useState<LookupEmployee[]>([]);
  const [departmentId, setDepartmentId] = useState('');
  const [dueDate, setDueDate] = useState('');
  return (
    <Modal open onClose={onClose} title={`Assign “${course.title}”`} description={can(PERMISSIONS.LEARNING_MANAGE) ? 'Assign to individuals or a whole department.' : 'Managers can assign training to their direct reports.'}
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button loading={assign.isPending} disabled={!people.length && !departmentId} onClick={async () => {
        const r = await assign.mutateAsync({ courseId: course.id, employeeIds: people.map((p) => p.id), departmentId: departmentId || undefined, dueDate: dueDate || undefined });
        toast.success(`Assigned to ${r.assigned} people${r.alreadyEnrolled ? ` (${r.alreadyEnrolled} already enrolled)` : ''}`);
        onClose();
      }}>Assign</Button></>}>
      <div className="space-y-4">
        <Field label="Add people"><EmployeePicker value={null} onChange={(e) => e && !people.some((p) => p.id === e.id) && setPeople([...people, e])} /></Field>
        {!!people.length && <div className="flex flex-wrap gap-1.5">{people.map((p) => <button key={p.id} onClick={() => setPeople(people.filter((x) => x.id !== p.id))} className="cursor-pointer rounded-full bg-primary-soft px-2.5 py-1 text-xs text-primary-soft-foreground">{p.fullName} ×</button>)}</div>}
        {can(PERMISSIONS.LEARNING_MANAGE) && <Field label="…or an entire department"><Select placeholder="None" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} options={departments.map((d) => ({ value: d.id, label: `${d.name} (${d.headcount})` }))} /></Field>}
        <Field label="Due date"><Input type="date" min={todayISO()} value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></Field>
      </div>
    </Modal>
  );
}

function RosterModal({ course, onClose }: { course: Course; onClose: () => void }) {
  const { data = [], isLoading } = useCourseEnrollments(course.id);
  return (
    <Modal open onClose={onClose} title={course.title} description={`${data.length} enrolled`} size="lg">
      {isLoading ? <Skeleton className="h-40" /> : (
        <Table>
          <THead><tr><TH>Employee</TH><TH>Progress</TH><TH>Due</TH><TH>Status</TH></tr></THead>
          <TBody>
            {data.map((e) => (
              <TR key={e.id}>
                <TD><PersonCell name={e.employee!.fullName} src={e.employee!.avatarUrl} subtitle={e.employee!.department?.name} size="xs" /></TD>
                <TD><div className="flex w-32 items-center gap-2"><Progress value={e.progress} /><span className="tabular text-xs">{e.progress}%</span></div></TD>
                <TD className={cn(e.dueDate && e.dueDate < todayISO() && e.status !== 'COMPLETED' && 'font-medium text-danger')}>{formatDate(e.dueDate)}</TD>
                <TD><StatusBadge status={e.status} /></TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </Modal>
  );
}

function CourseFormModal({ onClose }: { onClose: () => void }) {
  const save = useSaveCourse();
  const [c, setC] = useState<Partial<Course>>({ level: 'BEGINNER', format: 'VIDEO', durationHours: 1, category: 'Technical', status: 'PUBLISHED' });
  return (
    <Modal open onClose={onClose} title="New course" size="lg"
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button loading={save.isPending} onClick={async () => { await save.mutateAsync({ ...c, durationHours: Number(c.durationHours), contentUrl: c.contentUrl || undefined }); toast.success('Course created'); onClose(); }}>Create</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Title" required className="sm:col-span-2"><Input value={c.title ?? ''} onChange={(e) => setC({ ...c, title: e.target.value })} /></Field>
        <Field label="Description" required className="sm:col-span-2"><Textarea rows={3} value={c.description ?? ''} onChange={(e) => setC({ ...c, description: e.target.value })} /></Field>
        <Field label="Category"><Input value={c.category ?? ''} onChange={(e) => setC({ ...c, category: e.target.value })} /></Field>
        <Field label="Provider"><Input value={c.provider ?? ''} onChange={(e) => setC({ ...c, provider: e.target.value })} /></Field>
        <Field label="Level"><Select value={c.level} onChange={(e) => setC({ ...c, level: e.target.value as Course['level'] })} options={enumOptions(['BEGINNER', 'INTERMEDIATE', 'ADVANCED'])} /></Field>
        <Field label="Format"><Select value={c.format} onChange={(e) => setC({ ...c, format: e.target.value as Course['format'] })} options={enumOptions(['VIDEO', 'CLASSROOM', 'WEBINAR', 'DOCUMENT', 'INTERACTIVE'])} /></Field>
        <Field label="Duration (hours)"><Input type="number" min={0.5} step={0.5} value={c.durationHours} onChange={(e) => setC({ ...c, durationHours: Number(e.target.value) })} /></Field>
        <Field label="Content URL"><Input value={c.contentUrl ?? ''} onChange={(e) => setC({ ...c, contentUrl: e.target.value })} /></Field>
        <Checkbox label="Mandatory for all employees" checked={!!c.isMandatory} onChange={(e) => setC({ ...c, isMandatory: e.target.checked })} />
      </div>
    </Modal>
  );
}

export function LearningPage() {
  const { can } = useAccess();
  const manage = can(PERMISSIONS.LEARNING_MANAGE);
  const [tab, setTab] = useState('mine');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const { data: courses, isLoading } = useCourses({ page: 1, search: search || undefined, category: category || undefined });
  const { data: categories = [] } = useCategories();
  const { data: mine = [] } = useMyLearning();
  const { data: stats } = useLearningStats(manage);
  const [assigning, setAssigning] = useState<Course | null>(null);
  const [roster, setRoster] = useState<Course | null>(null);
  const [progressFor, setProgressFor] = useState<Enrollment | null>(null);
  const [creating, setCreating] = useState(false);
  const today = todayISO();
  const overdueMine = mine.filter((e) => e.dueDate && e.dueDate < today && e.status !== 'COMPLETED').length;

  return (
    <>
      <PageHeader title="Learning" description="Grow your skills and stay compliant." actions={manage && <Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> New course</Button>} />
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        {manage && stats ? (
          <>
            <StatCard label="Mandatory compliance" value={`${stats.mandatoryCompliance}%`} icon={ShieldCheck} tone="success" />
            <StatCard label="Completions" value={stats.completed} hint={`of ${stats.totalEnrollments} enrollments`} icon={CheckCircle2} />
            <StatCard label="In progress" value={stats.inProgress} icon={BookOpen} tone="info" />
            <StatCard label="Overdue" value={stats.overdue} icon={AlertTriangle} tone="danger" />
          </>
        ) : (
          <>
            <StatCard label="Enrolled" value={mine.length} icon={BookOpen} />
            <StatCard label="Completed" value={mine.filter((e) => e.status === 'COMPLETED').length} icon={GraduationCap} tone="success" />
            <StatCard label="Learning hours" value={mine.filter((e) => e.status === 'COMPLETED').reduce((s, e) => s + (e.course?.durationHours ?? 0), 0)} icon={Clock} tone="info" />
            <StatCard label="Overdue" value={overdueMine} icon={AlertTriangle} tone="danger" />
          </>
        )}
      </div>
      <Tabs className="mb-6" value={tab} onChange={setTab} tabs={[{ value: 'mine', label: 'My learning', count: mine.filter((e) => e.status !== 'COMPLETED').length }, { value: 'catalog', label: 'Course catalog' }]} />

      {tab === 'mine' && (
        <Card>
          <CardHeader title="My enrollments" description="Assigned and self-enrolled courses" />
          <Table>
            <THead><tr><TH>Course</TH><TH>Progress</TH><TH>Due</TH><TH>Status</TH><TH /></tr></THead>
            <TBody>
              {mine.map((e) => (
                <TR key={e.id}>
                  <TD><p className="font-medium">{e.course?.title}</p><p className="text-xs text-muted-foreground">{e.course?.category} · {e.course?.durationHours}h {e.course?.isMandatory && <Badge variant="danger" className="ml-1">Mandatory</Badge>}</p></TD>
                  <TD><div className="flex w-40 items-center gap-2"><Progress value={e.progress} tone={e.status === 'COMPLETED' ? 'success' : 'primary'} /><span className="tabular text-xs">{e.progress}%</span></div></TD>
                  <TD className={cn(e.dueDate && e.dueDate < today && e.status !== 'COMPLETED' && 'font-medium text-danger')}>{formatDate(e.dueDate)}</TD>
                  <TD><StatusBadge status={e.status} /></TD>
                  <TD className="text-right">{e.status !== 'COMPLETED' && <Button size="sm" variant="outline" onClick={() => setProgressFor(e)}>{e.progress ? 'Continue' : 'Start'}</Button>}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
          {!mine.length && <EmptyState icon={GraduationCap} title="You're not enrolled in any courses" action={<Button variant="outline" onClick={() => setTab('catalog')}>Browse catalog</Button>} />}
        </Card>
      )}

      {tab === 'catalog' && (
        <>
          <div className="mb-4 flex flex-wrap gap-3">
            <div className="relative w-72"><Search className="absolute top-2.5 left-3 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Search courses" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
            <Select className="w-48" placeholder="All categories" value={category} onChange={(e) => setCategory(e.target.value)} options={categories.map((c) => ({ value: c, label: c }))} />
          </div>
          {isLoading && <Skeleton className="h-64" />}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {courses?.data.map((c) => <CourseCard key={c.id} c={c} canManage={manage} onAssign={() => setAssigning(c)} onRoster={() => setRoster(c)} />)}
          </div>
        </>
      )}
      {assigning && <AssignModal course={assigning} onClose={() => setAssigning(null)} />}
      {roster && <RosterModal course={roster} onClose={() => setRoster(null)} />}
      {progressFor && <ProgressModal enrollment={progressFor} onClose={() => setProgressFor(null)} />}
      {creating && <CourseFormModal onClose={() => setCreating(false)} />}
    </>
  );
}
