'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox, Field, Input, Select, Textarea } from '@/components/ui/form-controls';
import { Modal } from '@/components/ui/modal';
import { useDepartments, useDesignations, useLocations } from '@/features/organization/api';
import { EMPLOYMENT_TYPES, enumOptions, WORK_MODES } from '@/lib/options';
import { useCreateJob, useUpdateJob, type Job } from '../api';

export function JobFormModal({ open, onClose, job }: { open: boolean; onClose: () => void; job?: Job }) {
  const create = useCreateJob();
  const update = useUpdateJob();
  const { data: departments = [] } = useDepartments();
  const { data: designations = [] } = useDesignations();
  const { data: locations = [] } = useLocations();
  const [f, setF] = useState({
    title: job?.title ?? '',
    departmentId: job?.departmentId ?? '',
    designationId: job?.designationId ?? '',
    locationId: job?.locationId ?? '',
    employmentType: job?.employmentType ?? 'FULL_TIME',
    workMode: job?.workMode ?? 'HYBRID',
    openings: String(job?.openings ?? 1),
    experienceMin: String(job?.experienceMin ?? 2),
    experienceMax: String(job?.experienceMax ?? ''),
    salaryMin: String(job?.salaryMin ?? ''),
    salaryMax: String(job?.salaryMax ?? ''),
    skills: (job?.skills ?? []).join(', '),
    description: job?.description ?? '',
    requirements: job?.requirements ?? '',
    closingDate: job?.closingDate ?? '',
    isPublished: job?.isPublished ?? true,
    submitForApproval: true,
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  const num = (v: string) => (v === '' ? undefined : Number(v));

  const save = async () => {
    if (f.title.length < 3 || f.description.length < 20) return toast.error('Add a title and a description of at least 20 characters');
    const body = {
      title: f.title,
      departmentId: f.departmentId || undefined,
      designationId: f.designationId || undefined,
      locationId: f.locationId || undefined,
      employmentType: f.employmentType,
      workMode: f.workMode,
      openings: num(f.openings),
      experienceMin: num(f.experienceMin),
      experienceMax: num(f.experienceMax),
      salaryMin: num(f.salaryMin),
      salaryMax: num(f.salaryMax),
      skills: f.skills.split(',').map((s) => s.trim()).filter(Boolean),
      description: f.description,
      requirements: f.requirements || undefined,
      closingDate: f.closingDate || undefined,
      isPublished: f.isPublished,
    };
    if (job) await update.mutateAsync({ id: job.id, ...body });
    else await create.mutateAsync({ ...body, submitForApproval: f.submitForApproval });
    toast.success(job ? 'Requisition updated' : f.submitForApproval ? 'Requisition submitted for approval' : 'Draft requisition saved');
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={job ? `Edit ${job.code}` : 'New job requisition'} description="New headcount is approved by the department head and HR before the role opens." size="xl"
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={save} loading={create.isPending || update.isPending}>{job ? 'Save' : f.submitForApproval ? 'Submit for approval' : 'Save draft'}</Button></>}>
      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Job title" required className="md:col-span-2"><Input value={f.title} onChange={set('title')} /></Field>
        <Field label="Openings"><Input type="number" min={1} value={f.openings} onChange={set('openings')} /></Field>
        <Field label="Department"><Select placeholder="Select" value={f.departmentId} onChange={set('departmentId')} options={departments.map((d) => ({ value: d.id, label: d.name }))} /></Field>
        <Field label="Designation"><Select placeholder="Select" value={f.designationId} onChange={set('designationId')} options={designations.map((d) => ({ value: d.id, label: d.title }))} /></Field>
        <Field label="Location"><Select placeholder="Select" value={f.locationId} onChange={set('locationId')} options={locations.map((l) => ({ value: l.id, label: l.name }))} /></Field>
        <Field label="Employment type"><Select value={f.employmentType} onChange={set('employmentType')} options={enumOptions(EMPLOYMENT_TYPES)} /></Field>
        <Field label="Work mode"><Select value={f.workMode} onChange={set('workMode')} options={enumOptions(WORK_MODES)} /></Field>
        <Field label="Closing date"><Input type="date" value={f.closingDate} onChange={set('closingDate')} /></Field>
        <Field label="Experience (years)">
          <div className="flex items-center gap-2"><Input type="number" min={0} value={f.experienceMin} onChange={set('experienceMin')} placeholder="Min" /><span className="text-muted-foreground">–</span><Input type="number" min={0} value={f.experienceMax} onChange={set('experienceMax')} placeholder="Max" /></div>
        </Field>
        <Field label="Salary range (annual)" className="md:col-span-2">
          <div className="flex items-center gap-2"><Input type="number" min={0} value={f.salaryMin} onChange={set('salaryMin')} placeholder="Min" /><span className="text-muted-foreground">–</span><Input type="number" min={0} value={f.salaryMax} onChange={set('salaryMax')} placeholder="Max" /></div>
        </Field>
        <Field label="Skills" hint="Comma separated" className="md:col-span-3"><Input value={f.skills} onChange={set('skills')} /></Field>
        <Field label="Description" required className="md:col-span-3"><Textarea rows={4} value={f.description} onChange={set('description')} /></Field>
        <Field label="Requirements" hint="One per line" className="md:col-span-3"><Textarea rows={3} value={f.requirements} onChange={set('requirements')} /></Field>
        <Checkbox label="Publish on the public careers site" checked={f.isPublished} onChange={(e) => setF({ ...f, isPublished: e.target.checked })} />
        {!job && <Checkbox label="Submit for approval now" checked={f.submitForApproval} onChange={(e) => setF({ ...f, submitForApproval: e.target.checked })} />}
      </div>
    </Modal>
  );
}
