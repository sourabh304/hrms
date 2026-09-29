'use client';

import { CalendarRange, Info } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox, Field, Input, Select, Textarea } from '@/components/ui/form-controls';
import { Modal } from '@/components/ui/modal';
import { formatDate, todayISO } from '@/lib/utils';
import { useApplyLeave, useBalances, useLeavePreview } from '../api';

export function ApplyLeaveModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: balances = [] } = useBalances();
  const apply = useApplyLeave();
  const [form, setForm] = useState({ leaveTypeId: '', startDate: todayISO(), endDate: todayISO(), isHalfDay: false, halfDaySession: 'FIRST', reason: '' });
  const preview = useLeavePreview(form.startDate, form.isHalfDay ? form.startDate : form.endDate, form.isHalfDay, open);

  const leaveTypeId = form.leaveTypeId || balances[0]?.leaveTypeId || '';
  const balance = balances.find((b) => b.leaveTypeId === leaveTypeId);
  const type = balance?.leaveType;
  const days = preview.data?.days ?? 0;
  const insufficient = !!type?.isPaid && !!balance && days > balance.available;
  const skipped = preview.data?.breakdown.filter((d) => d.kind !== 'WORKING') ?? [];

  const submit = async () => {
    if (form.reason.trim().length < 3) return toast.error('Please add a reason');
    await apply.mutateAsync({
      leaveTypeId,
      startDate: form.startDate,
      endDate: form.isHalfDay ? form.startDate : form.endDate,
      isHalfDay: form.isHalfDay,
      halfDaySession: form.isHalfDay ? form.halfDaySession : undefined,
      reason: form.reason,
    });
    toast.success('Leave request submitted for approval');
    setForm((f) => ({ ...f, reason: '' }));
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Request time off"
      description="Your request routes to your manager (and HR for extended leave)."
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={apply.isPending} disabled={!days || insufficient}>
            Submit request
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Leave type" required className="sm:col-span-2">
          <Select
            value={leaveTypeId}
            onChange={(e) => setForm({ ...form, leaveTypeId: e.target.value })}
            options={balances.map((b) => ({ value: b.leaveTypeId, label: `${b.leaveType.name}${b.leaveType.isPaid ? ` — ${b.available} day(s) available` : ' — unpaid'}` }))}
          />
        </Field>
        <Field label={form.isHalfDay ? 'Date' : 'From'} required>
          <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value, endDate: e.target.value > form.endDate ? e.target.value : form.endDate })} />
        </Field>
        {!form.isHalfDay ? (
          <Field label="To" required>
            <Input type="date" min={form.startDate} value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
          </Field>
        ) : (
          <Field label="Session">
            <Select value={form.halfDaySession} onChange={(e) => setForm({ ...form, halfDaySession: e.target.value })} options={[{ value: 'FIRST', label: 'First half (morning)' }, { value: 'SECOND', label: 'Second half (afternoon)' }]} />
          </Field>
        )}
        {type?.allowHalfDay && (
          <Checkbox className="sm:col-span-2" label="Half day" checked={form.isHalfDay} onChange={(e) => setForm({ ...form, isHalfDay: e.target.checked })} />
        )}
        <Field label="Reason" required className="sm:col-span-2">
          <Textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Share context for your manager" />
        </Field>
      </div>

      <div className="mt-5 rounded-lg border border-border bg-muted/50 p-4">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-medium">
            <CalendarRange className="h-4 w-4 text-primary" /> Working days requested
          </span>
          <span className="tabular text-lg font-semibold">{days}</span>
        </div>
        {!!skipped.length && (
          <p className="mt-2 flex gap-1.5 text-xs text-muted-foreground">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Excludes {skipped.map((d) => (d.holiday ? `${d.holiday} (${formatDate(d.date, 'MMM d')})` : formatDate(d.date, 'EEE MMM d'))).join(', ')}
          </p>
        )}
        {insufficient && <p className="mt-2 text-xs font-medium text-danger">Insufficient balance: {balance?.available} day(s) available.</p>}
        {type?.maxConsecutiveDays && <p className="mt-1 text-xs text-muted-foreground">{type.name} allows at most {type.maxConsecutiveDays} consecutive days.</p>}
      </div>
    </Modal>
  );
}
