'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft, Briefcase, CheckCircle2, MapPin, Search } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Logo } from '@/components/brand';
import { Badge } from '@/components/ui/badge';
import { Button, LinkButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field, Input, Textarea } from '@/components/ui/form-controls';
import { EmptyState, PageLoader } from '@/components/ui/misc';
import type { Job } from '@/features/recruitment/api';
import { get, post } from '@/lib/api-client';
import { humanize, timeAgo } from '@/lib/utils';

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <Link href="/careers"><Logo /></Link>
          <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">Employee sign in</Link>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
    </div>
  );
}

export function CareersList() {
  const { data = [], isLoading } = useQuery({ queryKey: ['careers'], queryFn: () => get<Job[]>('/careers/jobs') });
  const [q, setQ] = useState('');
  const jobs = data.filter((j) => `${j.title} ${j.department?.name} ${j.location?.city}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <Shell>
      <div className="mb-10 rounded-2xl bg-sidebar px-8 py-12 text-white">
        <p className="text-sm font-medium text-indigo-300">Careers at Segue</p>
        <h1 className="mt-2 max-w-xl text-3xl font-semibold tracking-tight">Build the people platform that global teams love to use.</h1>
        <p className="mt-3 max-w-xl text-sm text-sidebar-foreground/80">We&apos;re a distributed team across Bengaluru, New York, London and Singapore. Join us.</p>
        <div className="relative mt-6 max-w-md">
          <Search className="absolute top-3 left-3 h-4 w-4 text-muted-foreground" />
          <Input className="h-10 pl-9" placeholder="Search roles, teams or cities" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">{jobs.length} open position{jobs.length === 1 ? '' : 's'}</p>
      {isLoading && <PageLoader />}
      <div className="space-y-3">
        {jobs.map((j) => (
          <Link key={j.id} href={`/careers/${j.id}`}>
            <Card className="flex items-center justify-between gap-4 p-5 transition-shadow hover:shadow-md">
              <div>
                <p className="font-semibold">{j.title}</p>
                <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" />{j.department?.name}</span>
                  <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{j.location?.city}, {j.location?.country}</span>
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge variant="primary">{humanize(j.workMode)}</Badge>
                <Badge>{humanize(j.employmentType)}</Badge>
              </div>
            </Card>
          </Link>
        ))}
      </div>
      {!isLoading && !jobs.length && <Card><EmptyState icon={Briefcase} title="No open roles match your search" /></Card>}
    </Shell>
  );
}

export function CareerDetail({ id }: { id: string }) {
  const { data: job, isLoading, error } = useQuery({ queryKey: ['careers', id], queryFn: () => get<Job>(`/careers/jobs/${id}`) });
  const [f, setF] = useState({ firstName: '', lastName: '', email: '', phone: '', linkedinUrl: '', resumeUrl: '', experienceYears: '', coverLetter: '' });
  const apply = useMutation({
    mutationFn: () =>
      post<{ message: string }>(`/careers/jobs/${id}/apply`, {
        firstName: f.firstName,
        lastName: f.lastName,
        email: f.email,
        phone: f.phone || undefined,
        linkedinUrl: f.linkedinUrl || undefined,
        resumeUrl: f.resumeUrl || undefined,
        experienceYears: f.experienceYears ? Number(f.experienceYears) : undefined,
        coverLetter: f.coverLetter || undefined,
      }),
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  if (isLoading) return <Shell><PageLoader /></Shell>;
  if (error || !job) return <Shell><EmptyState title="This position is no longer available" action={<LinkButton href="/careers" variant="outline">See all roles</LinkButton>} /></Shell>;

  return (
    <Shell>
      <Link href="/careers" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> All roles</Link>
      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{job.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{job.department?.name} · {job.location?.city}, {job.location?.country} · {humanize(job.workMode)} · posted {job.postedAt ? timeAgo(job.postedAt) : 'recently'}</p>
          <div className="mt-8 space-y-6 text-sm leading-relaxed">
            <section><h2 className="mb-2 font-semibold">About the role</h2><p className="whitespace-pre-line text-muted-foreground">{job.description}</p></section>
            {job.requirements && (
              <section><h2 className="mb-2 font-semibold">What you&apos;ll bring</h2>
                <ul className="list-disc space-y-1 pl-5 text-muted-foreground">{job.requirements.split('\n').filter(Boolean).map((r) => <li key={r}>{r}</li>)}</ul>
              </section>
            )}
            {!!job.skills?.length && <div className="flex flex-wrap gap-1.5">{job.skills.map((s) => <Badge key={s} variant="primary">{s}</Badge>)}</div>}
          </div>
        </div>
        <Card className="h-fit p-6">
          {apply.isSuccess ? (
            <div className="py-8 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-success" />
              <p className="mt-3 font-semibold">Application received</p>
              <p className="mt-1 text-sm text-muted-foreground">{apply.data.message}</p>
            </div>
          ) : (
            <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); apply.mutate(); }}>
              <p className="font-semibold">Apply for this role</p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="First name" required><Input required value={f.firstName} onChange={set('firstName')} /></Field>
                <Field label="Last name" required><Input required value={f.lastName} onChange={set('lastName')} /></Field>
              </div>
              <Field label="Email" required><Input type="email" required value={f.email} onChange={set('email')} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Phone"><Input value={f.phone} onChange={set('phone')} /></Field>
                <Field label="Years of experience"><Input type="number" min={0} value={f.experienceYears} onChange={set('experienceYears')} /></Field>
              </div>
              <Field label="LinkedIn URL"><Input type="url" value={f.linkedinUrl} onChange={set('linkedinUrl')} /></Field>
              <Field label="Résumé link" hint="Google Drive, Dropbox or personal site"><Input type="url" value={f.resumeUrl} onChange={set('resumeUrl')} /></Field>
              <Field label="Cover letter"><Textarea rows={4} value={f.coverLetter} onChange={set('coverLetter')} /></Field>
              {apply.error && <p className="text-sm text-danger">{apply.error.message}</p>}
              <Button type="submit" className="w-full" loading={apply.isPending}>Submit application</Button>
              <p className="text-center text-[11px] text-muted-foreground">By applying you agree to our candidate privacy notice.</p>
            </form>
          )}
        </Card>
      </div>
    </Shell>
  );
}
