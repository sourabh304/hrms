'use client';

import { Megaphone, Pencil, Pin, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge, type BadgeVariant } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox, Field, Input, Select, Textarea } from '@/components/ui/form-controls';
import { Modal } from '@/components/ui/modal';
import { EmptyState, PageHeader, PersonCell, Skeleton } from '@/components/ui/misc';
import { Segmented } from '@/components/ui/tabs';
import { useAccess } from '@/features/auth/api';
import { PERMISSIONS } from '@/features/auth/types';
import { useDepartments } from '@/features/organization/api';
import { enumOptions } from '@/lib/options';
import { humanize, timeAgo } from '@/lib/utils';
import { useAnnouncements, useDeleteAnnouncement, useSaveAnnouncement, type Announcement } from '../api';

export const CATEGORY_VARIANT: Record<Announcement['category'], BadgeVariant> = {
  GENERAL: 'neutral',
  POLICY: 'info',
  EVENT: 'primary',
  CELEBRATION: 'success',
  URGENT: 'danger',
};

export function AnnouncementCard({ a, onEdit, onDelete }: { a: Announcement; onEdit?: () => void; onDelete?: () => void }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {a.isPinned && <Badge variant="warning"><Pin className="h-3 w-3" /> Pinned</Badge>}
          <Badge variant={CATEGORY_VARIANT[a.category]}>{humanize(a.category)}</Badge>
          {a.department && <Badge>{a.department.name}</Badge>}
        </div>
        {(onEdit || onDelete) && (
          <div className="flex gap-1">
            {onEdit && <Button variant="ghost" size="icon-sm" onClick={onEdit} aria-label="Edit"><Pencil className="h-3.5 w-3.5" /></Button>}
            {onDelete && <Button variant="ghost" size="icon-sm" onClick={onDelete} aria-label="Delete"><Trash2 className="h-3.5 w-3.5" /></Button>}
          </div>
        )}
      </div>
      <h3 className="mt-3 text-base font-semibold">{a.title}</h3>
      <p className="mt-2 text-sm leading-relaxed whitespace-pre-line text-muted-foreground">{a.content}</p>
      <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
        {a.author ? <PersonCell name={a.author.fullName} src={a.author.avatarUrl} subtitle={a.author.designation?.title} size="xs" /> : <span />}
        <span className="text-xs text-muted-foreground">{timeAgo(a.publishedAt)}</span>
      </div>
    </Card>
  );
}

export function AnnouncementsPage() {
  const { can } = useAccess();
  const canManage = can(PERMISSIONS.ANNOUNCEMENT_MANAGE);
  const [view, setView] = useState('feed');
  const { data = [], isLoading } = useAnnouncements(view === 'all');
  const { data: departments = [] } = useDepartments();
  const save = useSaveAnnouncement();
  const remove = useDeleteAnnouncement();
  const [editing, setEditing] = useState<Partial<Announcement> | null>(null);

  return (
    <>
      <PageHeader
        title="Announcements"
        description="Company news, policy updates and celebrations."
        actions={
          canManage && (
            <>
              <Segmented value={view} onChange={setView} options={[{ value: 'feed', label: 'My feed' }, { value: 'all', label: 'All (incl. scheduled)' }]} />
              <Button onClick={() => setEditing({ category: 'GENERAL' })}><Plus className="h-4 w-4" /> New announcement</Button>
            </>
          )
        }
      />
      {isLoading && <Skeleton className="h-64" />}
      {!isLoading && !data.length && <Card><EmptyState icon={Megaphone} title="No announcements yet" /></Card>}
      <div className="mx-auto max-w-3xl space-y-4">
        {data.map((a) => (
          <AnnouncementCard
            key={a.id}
            a={a}
            onEdit={canManage ? () => setEditing(a) : undefined}
            onDelete={canManage ? async () => { await remove.mutateAsync(a.id); toast.success('Announcement deleted'); } : undefined}
          />
        ))}
      </div>
      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.id ? 'Edit announcement' : 'New announcement'}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button loading={save.isPending} onClick={async () => {
              const e = editing!;
              await save.mutateAsync({ id: e.id, title: e.title, content: e.content, category: e.category, isPinned: !!e.isPinned, departmentId: e.departmentId || null, expiresOn: e.expiresOn || undefined });
              toast.success(e.id ? 'Announcement updated' : 'Announcement published');
              setEditing(null);
            }}>{editing?.id ? 'Save' : 'Publish'}</Button>
          </>
        }
      >
        {editing && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Title" required className="sm:col-span-2"><Input value={editing.title ?? ''} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></Field>
            <Field label="Message" required className="sm:col-span-2"><Textarea rows={6} value={editing.content ?? ''} onChange={(e) => setEditing({ ...editing, content: e.target.value })} /></Field>
            <Field label="Category"><Select value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value as Announcement['category'] })} options={enumOptions(['GENERAL', 'POLICY', 'EVENT', 'CELEBRATION', 'URGENT'])} /></Field>
            <Field label="Audience"><Select placeholder="Whole company" value={editing.departmentId ?? ''} onChange={(e) => setEditing({ ...editing, departmentId: e.target.value })} options={departments.map((d) => ({ value: d.id, label: d.name }))} /></Field>
            <Field label="Expires on"><Input type="date" value={editing.expiresOn ?? ''} onChange={(e) => setEditing({ ...editing, expiresOn: e.target.value })} /></Field>
            <div className="flex items-end pb-2"><Checkbox label="Pin to top" checked={!!editing.isPinned} onChange={(e) => setEditing({ ...editing, isPinned: e.target.checked })} /></div>
          </div>
        )}
      </Modal>
    </>
  );
}
