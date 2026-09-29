'use client';

import { format, parseISO } from 'date-fns';
import { CalendarHeart, ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge, type BadgeVariant } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field, Input, Select, Textarea } from '@/components/ui/form-controls';
import { Modal } from '@/components/ui/modal';
import { EmptyState, PageHeader, Skeleton } from '@/components/ui/misc';
import { useAccess } from '@/features/auth/api';
import { PERMISSIONS } from '@/features/auth/types';
import { useLocations } from '@/features/organization/api';
import { cn, todayISO } from '@/lib/utils';
import { useDeleteHoliday, useHolidays, useSaveHoliday, type Holiday } from '../api';

const TYPE_VARIANT: Record<Holiday['type'], BadgeVariant> = { PUBLIC: 'info', COMPANY: 'primary', OPTIONAL: 'neutral' };

export function HolidaysPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [locationId, setLocationId] = useState('');
  const { data = [], isLoading } = useHolidays(year, locationId || undefined);
  const { data: locations = [] } = useLocations();
  const { can } = useAccess();
  const save = useSaveHoliday();
  const remove = useDeleteHoliday();
  const [editing, setEditing] = useState<Partial<Holiday> | null>(null);
  const today = todayISO();

  const byMonth = data.reduce<Record<string, Holiday[]>>((m, h) => {
    const key = h.date.slice(0, 7);
    (m[key] ??= []).push(h);
    return m;
  }, {});

  return (
    <>
      <PageHeader
        title="Holiday calendar"
        description="Public, company and optional (floating) holidays by location."
        actions={
          <>
            <Select className="w-48" placeholder="All locations" options={locations.map((l) => ({ value: l.id, label: l.name }))} value={locationId} onChange={(e) => setLocationId(e.target.value)} />
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" onClick={() => setYear(year - 1)} aria-label="Previous year"><ChevronLeft className="h-4 w-4" /></Button>
              <span className="tabular w-14 text-center text-sm font-semibold">{year}</span>
              <Button variant="outline" size="icon" onClick={() => setYear(year + 1)} aria-label="Next year"><ChevronRight className="h-4 w-4" /></Button>
            </div>
            {can(PERMISSIONS.LEAVE_MANAGE) && <Button onClick={() => setEditing({ type: 'PUBLIC', date: today })}><Plus className="h-4 w-4" /> Add holiday</Button>}
          </>
        }
      />
      {isLoading && <Skeleton className="h-96" />}
      {!isLoading && !data.length && <Card><EmptyState icon={CalendarHeart} title={`No holidays configured for ${year}`} /></Card>}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Object.entries(byMonth).map(([month, holidays]) => (
          <Card key={month}>
            <p className="border-b border-border px-5 py-3 text-sm font-semibold">{format(parseISO(`${month}-01`), 'MMMM')}</p>
            <ul className="divide-y divide-border">
              {holidays.map((h) => (
                <li key={h.id} className={cn('group flex items-center gap-4 px-5 py-3', h.date < today && 'opacity-60')}>
                  <div className="w-11 shrink-0 rounded-lg border border-border text-center">
                    <p className="bg-primary-soft py-0.5 text-[10px] font-semibold text-primary-soft-foreground uppercase">{format(parseISO(h.date), 'EEE')}</p>
                    <p className="py-1 text-base font-semibold">{format(parseISO(h.date), 'd')}</p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{h.name}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge variant={TYPE_VARIANT[h.type]}>{h.type === 'OPTIONAL' ? 'Optional' : h.type === 'COMPANY' ? 'Company' : 'Public'}</Badge>
                      <span className="truncate text-xs text-muted-foreground">{h.location?.name ?? 'All locations'}</span>
                    </div>
                  </div>
                  {can(PERMISSIONS.LEAVE_MANAGE) && (
                    <Button variant="ghost" size="icon-sm" className="opacity-0 group-hover:opacity-100" aria-label={`Delete ${h.name}`} onClick={async () => { await remove.mutateAsync(h.id); toast.success('Holiday removed'); }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title="Add holiday"
        footer={
          <>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button loading={save.isPending} onClick={async () => {
              const e = editing!;
              await save.mutateAsync({ name: e.name, date: e.date, type: e.type, locationId: e.locationId || null, description: e.description || undefined });
              toast.success('Holiday added');
              setEditing(null);
            }}>Save</Button>
          </>
        }
      >
        {editing && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" required className="sm:col-span-2"><Input value={editing.name ?? ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></Field>
            <Field label="Date" required><Input type="date" value={editing.date} onChange={(e) => setEditing({ ...editing, date: e.target.value })} /></Field>
            <Field label="Type"><Select value={editing.type} onChange={(e) => setEditing({ ...editing, type: e.target.value as Holiday['type'] })} options={[{ value: 'PUBLIC', label: 'Public' }, { value: 'COMPANY', label: 'Company' }, { value: 'OPTIONAL', label: 'Optional (floating)' }]} /></Field>
            <Field label="Location" className="sm:col-span-2"><Select placeholder="All locations" options={locations.map((l) => ({ value: l.id, label: l.name }))} value={editing.locationId ?? ''} onChange={(e) => setEditing({ ...editing, locationId: e.target.value })} /></Field>
            <Field label="Description" className="sm:col-span-2"><Textarea rows={2} value={editing.description ?? ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></Field>
          </div>
        )}
      </Modal>
    </>
  );
}
