'use client';

import { BadgeCheck, Banknote, Clock, Paperclip, Plus, Upload, Wallet, XCircle } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { BarList } from '@/components/charts';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Field, Input, Select, Textarea } from '@/components/ui/form-controls';
import { ConfirmDialog, Modal } from '@/components/ui/modal';
import { EmptyState, PageHeader, PersonCell, Skeleton, StatCard } from '@/components/ui/misc';
import { Pagination, Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { Segmented, Tabs } from '@/components/ui/tabs';
import { useAccess } from '@/features/auth/api';
import { PERMISSIONS } from '@/features/auth/types';
import { useCurrency } from '@/features/organization/api';
import { fileUrl, uploadFile } from '@/lib/api-client';
import { enumOptions } from '@/lib/options';
import { formatDate, formatMoney, humanize, todayISO } from '@/lib/utils';
import { EXPENSE_CATEGORIES, useCreateExpense, useExpenseAction, useExpenses, useExpenseSummary, type ExpenseClaim } from '../api';

function NewClaimModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateExpense();
  const currency = useCurrency();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [receipt, setReceipt] = useState<{ id: string; name: string } | null>(null);
  const [f, setF] = useState({ title: '', category: 'TRAVEL', amount: '', expenseDate: todayISO(), merchant: '', description: '' });

  const submit = async (asDraft: boolean) => {
    if (!f.title || !Number(f.amount)) return toast.error('Title and amount are required');
    await create.mutateAsync({
      title: f.title,
      category: f.category,
      amount: Number(f.amount),
      expenseDate: f.expenseDate,
      merchant: f.merchant || undefined,
      description: f.description || undefined,
      receiptFileId: receipt?.id,
      submit: !asDraft,
    });
    toast.success(asDraft ? 'Draft saved' : 'Claim submitted for approval');
    setF({ title: '', category: 'TRAVEL', amount: '', expenseDate: todayISO(), merchant: '', description: '' });
    setReceipt(null);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New expense claim"
      description="Claims route to your manager, then Finance. Claims above 2,000 also need skip-level approval."
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={() => submit(true)} disabled={create.isPending}>Save draft</Button>
          <Button onClick={() => submit(false)} loading={create.isPending}>Submit claim</Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Title" required className="sm:col-span-2"><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="e.g. Client visit — taxi" /></Field>
        <Field label="Category"><Select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} options={enumOptions(EXPENSE_CATEGORIES)} /></Field>
        <Field label={`Amount (${currency})`} required><Input type="number" min="0" step="0.01" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></Field>
        <Field label="Expense date"><Input type="date" max={todayISO()} value={f.expenseDate} onChange={(e) => setF({ ...f, expenseDate: e.target.value })} /></Field>
        <Field label="Merchant"><Input value={f.merchant} onChange={(e) => setF({ ...f, merchant: e.target.value })} /></Field>
        <Field label="Description" className="sm:col-span-2"><Textarea rows={2} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
        <div className="sm:col-span-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setUploading(true);
              try {
                const stored = await uploadFile(file);
                setReceipt({ id: stored.id, name: stored.originalName });
              } catch (err) {
                toast.error(err instanceof Error ? err.message : 'Upload failed');
              } finally {
                setUploading(false);
              }
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-input px-4 py-5 text-sm text-muted-foreground hover:border-primary hover:text-foreground"
          >
            {receipt ? <><Paperclip className="h-4 w-4" /> {receipt.name}</> : <><Upload className="h-4 w-4" /> {uploading ? 'Uploading…' : 'Attach receipt (PDF or image)'}</>}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function ClaimsTable({ scope }: { scope: 'me' | 'team' | 'all' }) {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const { data, isLoading } = useExpenses({ scope, page, status: status || undefined });
  const action = useExpenseAction();
  const [reimbursing, setReimbursing] = useState<ExpenseClaim | null>(null);
  const [reference, setReference] = useState('');

  return (
    <Card>
      <div className="border-b border-border p-3">
        <Segmented
          value={status}
          onChange={(v) => { setStatus(v); setPage(1); }}
          options={[{ value: '', label: 'All' }, { value: 'SUBMITTED', label: 'In approval' }, { value: 'APPROVED', label: 'Approved' }, { value: 'REIMBURSED', label: 'Reimbursed' }, { value: 'REJECTED', label: 'Rejected' }, { value: 'DRAFT', label: 'Drafts' }]}
        />
      </div>
      <Table>
        <THead>
          <tr>
            <TH>Claim</TH>
            {scope !== 'me' && <TH>Employee</TH>}
            <TH>Category</TH>
            <TH>Date</TH>
            <TH className="text-right">Amount</TH>
            <TH>Status</TH>
            <TH />
          </tr>
        </THead>
        <TBody>
          {isLoading && <tr><TD colSpan={7}><Skeleton className="h-24" /></TD></tr>}
          {data?.data.map((c) => (
            <TR key={c.id}>
              <TD>
                <p className="font-medium">{c.title}</p>
                <p className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
                  {c.claimNumber}
                  {c.receiptFileId && <a href={fileUrl(c.receiptFileId)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 font-sans text-primary hover:underline"><Paperclip className="h-3 w-3" />receipt</a>}
                </p>
              </TD>
              {scope !== 'me' && <TD><PersonCell name={c.employee.fullName} src={c.employee.avatarUrl} subtitle={c.employee.department?.name} /></TD>}
              <TD className="text-muted-foreground">{humanize(c.category)}</TD>
              <TD className="whitespace-nowrap">{formatDate(c.expenseDate)}</TD>
              <TD className="tabular text-right font-medium">{formatMoney(c.amount, c.currency)}</TD>
              <TD>
                <StatusBadge status={c.status} label={c.status === 'SUBMITTED' ? 'In approval' : undefined} />
                {c.decisionNote && <p className="mt-1 max-w-40 truncate text-[11px] text-muted-foreground" title={c.decisionNote}>“{c.decisionNote}”</p>}
              </TD>
              <TD className="text-right whitespace-nowrap">
                {scope === 'me' && c.status === 'DRAFT' && <Button size="sm" variant="ghost" onClick={async () => { await action.mutateAsync({ id: c.id, action: 'submit' }); toast.success('Submitted'); }}>Submit</Button>}
                {scope === 'me' && (c.status === 'DRAFT' || c.status === 'SUBMITTED') && <Button size="sm" variant="ghost" onClick={async () => { await action.mutateAsync({ id: c.id, action: 'cancel' }); toast.success('Claim cancelled'); }}>Cancel</Button>}
                {scope === 'all' && c.status === 'APPROVED' && <Button size="sm" variant="secondary" onClick={() => setReimbursing(c)}><Banknote className="h-3.5 w-3.5" /> Reimburse</Button>}
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
      {data && !data.data.length && <EmptyState icon={Wallet} title="No claims found" />}
      {data && <Pagination page={page} totalPages={data.meta.totalPages} total={data.meta.total} onPage={setPage} />}
      <ConfirmDialog
        open={!!reimbursing}
        onClose={() => setReimbursing(null)}
        title="Mark as reimbursed"
        message={reimbursing ? `${reimbursing.claimNumber} · ${formatMoney(reimbursing.amount, reimbursing.currency)} to ${reimbursing.employee.fullName}` : ''}
        confirmLabel="Confirm payment"
        variant="success"
        loading={action.isPending}
        onConfirm={async () => {
          await action.mutateAsync({ id: reimbursing!.id, action: 'reimburse', paymentReference: reference || undefined });
          toast.success('Reimbursement recorded');
          setReimbursing(null);
          setReference('');
        }}
      >
        <Field label="Payment reference" className="mt-4"><Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. bank transfer ID" /></Field>
      </ConfirmDialog>
    </Card>
  );
}

export function ExpensesPage() {
  const params = useSearchParams();
  const router = useRouter();
  const { can, isManager } = useAccess();
  const isFinance = can(PERMISSIONS.EXPENSE_MANAGE);
  const [tab, setTab] = useState('mine');
  const [open, setOpen] = useState(params.get('new') === '1');
  const { data: summary } = useExpenseSummary(tab === 'all' ? 'all' : 'me');
  const currency = useCurrency();

  return (
    <>
      <PageHeader title="Expenses" description="Submit claims, track approvals and reimbursements." actions={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> New claim</Button>} />
      {summary && (
        <div className="mb-6 grid gap-4 lg:grid-cols-[1fr_1fr_1fr_1.4fr]">
          <StatCard label="In approval" value={formatMoney(summary.pending, currency)} icon={Clock} tone="warning" />
          <StatCard label="Approved, awaiting payment" value={formatMoney(summary.approved, currency)} icon={BadgeCheck} tone="info" />
          <StatCard label="Reimbursed" value={formatMoney(summary.reimbursed, currency)} icon={Banknote} tone="success" />
          <Card>
            <CardHeader title="Spend by category" description={tab === 'all' ? 'Organization' : 'My claims'} />
            <CardContent className="py-3">
              {summary.byCategory.length ? (
                <BarList items={summary.byCategory.slice(0, 4).map((c) => ({ name: humanize(c.category), value: c.total }))} format={(v) => formatMoney(v, currency, true)} />
              ) : (
                <p className="flex items-center gap-2 text-xs text-muted-foreground"><XCircle className="h-4 w-4" /> No spend yet</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
      <Tabs className="mb-6" value={tab} onChange={setTab} tabs={[
        { value: 'mine', label: 'My claims' },
        { value: 'team', label: 'Team claims', hidden: !isManager },
        { value: 'all', label: 'All claims (Finance)', hidden: !isFinance },
      ]} />
      {tab === 'mine' && <ClaimsTable scope="me" />}
      {tab === 'team' && <ClaimsTable scope="team" />}
      {tab === 'all' && <ClaimsTable scope="all" />}
      <NewClaimModal open={open} onClose={() => { setOpen(false); if (params.get('new')) router.replace('/expenses'); }} />
    </>
  );
}
