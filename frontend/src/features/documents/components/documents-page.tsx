'use client';

import { BarChart3, CheckCircle2, Download, FileText, Plus, Search, ShieldAlert, Trash2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox, Field, Input, Select, Textarea } from '@/components/ui/form-controls';
import { Modal } from '@/components/ui/modal';
import { EmptyState, PageHeader, PageLoader, Progress, Skeleton } from '@/components/ui/misc';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { Tabs } from '@/components/ui/tabs';
import { useAccess } from '@/features/auth/api';
import { PERMISSIONS } from '@/features/auth/types';
import { EmployeePicker } from '@/features/employees/components/employee-picker';
import { fileUrl, uploadFile } from '@/lib/api-client';
import { enumOptions } from '@/lib/options';
import { formatDate, formatDateTime, humanize } from '@/lib/utils';
import { useAcknowledge, useAckReport, useDeleteDocument, useDocuments, useSaveDocument, type DocumentCategory, type HrDocument } from '../api';

const CATEGORIES: DocumentCategory[] = ['POLICY', 'HANDBOOK', 'FORM', 'COMPLIANCE', 'CONTRACT', 'LETTER', 'ID_PROOF', 'CERTIFICATE', 'OTHER'];

function DocumentViewer({ doc, onClose }: { doc: HrDocument; onClose: () => void }) {
  const ack = useAcknowledge();
  const needsAck = doc.requiresAcknowledgment && !doc.acknowledgedAt && !doc.employeeId;
  return (
    <Modal open onClose={onClose} size="lg" title={doc.title} description={`${humanize(doc.category)} · version ${doc.version} · updated ${formatDate(doc.updatedAt)}`}
      footer={needsAck ? <Button loading={ack.isPending} onClick={async () => { await ack.mutateAsync(doc.id); toast.success('Acknowledged'); onClose(); }}><CheckCircle2 className="h-4 w-4" /> I have read and acknowledge this policy</Button> : undefined}>
      {doc.description && <p className="mb-4 text-sm text-muted-foreground">{doc.description}</p>}
      {doc.content && <div className="rounded-lg bg-muted p-5 text-sm leading-relaxed whitespace-pre-line">{doc.content}</div>}
      {doc.file && <a href={fileUrl(doc.file.id)} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm text-primary hover:underline"><Download className="h-4 w-4" /> {doc.file.originalName}</a>}
      {doc.acknowledgedAt && <p className="mt-4 flex items-center gap-1.5 text-xs text-success"><CheckCircle2 className="h-3.5 w-3.5" /> You acknowledged this on {formatDateTime(doc.acknowledgedAt)}</p>}
    </Modal>
  );
}

function AckReportModal({ id, onClose }: { id: string; onClose: () => void }) {
  const { data, isLoading } = useAckReport(id);
  return (
    <Modal open onClose={onClose} size="lg" title="Acknowledgment report" description={data ? `${data.document.title} v${data.document.version}` : undefined}>
      {isLoading || !data ? <PageLoader /> : (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Progress value={(data.acknowledged / Math.max(1, data.total)) * 100} tone="success" className="h-2" />
            <span className="tabular shrink-0 text-sm font-semibold">{data.acknowledged}/{data.total}</span>
          </div>
          <Table>
            <THead><tr><TH>Employee</TH><TH>Department</TH><TH>Acknowledged</TH></tr></THead>
            <TBody>
              {data.rows.sort((a, b) => Number(!!a.acknowledgedAt) - Number(!!b.acknowledgedAt)).map((r) => (
                <TR key={r.employee.id}>
                  <TD>{r.employee.fullName} <span className="font-mono text-xs text-muted-foreground">{r.employee.employeeCode}</span></TD>
                  <TD className="text-muted-foreground">{r.employee.department}</TD>
                  <TD>{r.acknowledgedAt ? <span className="text-success">{formatDate(r.acknowledgedAt)}</span> : <Badge variant="warning">Pending</Badge>}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </div>
      )}
    </Modal>
  );
}

function UploadModal({ onClose }: { onClose: () => void }) {
  const save = useSaveDocument();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<{ id: string; name: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [personal, setPersonal] = useState(false);
  const [d, setD] = useState({ title: '', description: '', category: 'POLICY', version: '1.0', content: '', requiresAcknowledgment: false, employeeId: '' });

  return (
    <Modal open onClose={onClose} size="lg" title="Add document"
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button loading={save.isPending} disabled={!d.title || (!file && !d.content) || (personal && !d.employeeId)} onClick={async () => {
        await save.mutateAsync({ title: d.title, description: d.description || undefined, category: d.category, version: d.version, content: d.content || undefined, fileId: file?.id, requiresAcknowledgment: !personal && d.requiresAcknowledgment, employeeId: personal ? d.employeeId : undefined });
        toast.success('Document published');
        onClose();
      }}>Publish</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2 flex gap-4">
          <Checkbox label="Personal document for one employee" checked={personal} onChange={(e) => setPersonal(e.target.checked)} />
        </div>
        {personal && <Field label="Employee" required className="sm:col-span-2"><EmployeePicker onChange={(e) => setD({ ...d, employeeId: e?.id ?? '' })} /></Field>}
        <Field label="Title" required className="sm:col-span-2"><Input value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} /></Field>
        <Field label="Category"><Select value={d.category} onChange={(e) => setD({ ...d, category: e.target.value })} options={enumOptions(CATEGORIES)} /></Field>
        <Field label="Version"><Input value={d.version} onChange={(e) => setD({ ...d, version: e.target.value })} /></Field>
        <Field label="Summary" className="sm:col-span-2"><Input value={d.description} onChange={(e) => setD({ ...d, description: e.target.value })} /></Field>
        <Field label="Content (optional if uploading a file)" className="sm:col-span-2"><Textarea rows={5} value={d.content} onChange={(e) => setD({ ...d, content: e.target.value })} /></Field>
        <div className="sm:col-span-2">
          <input ref={fileRef} type="file" className="hidden" onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            setUploading(true);
            try {
              const stored = await uploadFile(f, personal ? 'PRIVATE' : 'COMPANY');
              setFile({ id: stored.id, name: stored.originalName });
            } catch (err) {
              toast.error(err instanceof Error ? err.message : 'Upload failed');
            } finally {
              setUploading(false);
            }
          }} />
          <button type="button" onClick={() => fileRef.current?.click()} className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-input px-4 py-5 text-sm text-muted-foreground hover:border-primary">
            <Upload className="h-4 w-4" /> {file ? file.name : uploading ? 'Uploading…' : 'Upload PDF, Office document or image (max 10 MB)'}
          </button>
        </div>
        {!personal && <Checkbox className="sm:col-span-2" label="Require every employee to acknowledge (notifies everyone)" checked={d.requiresAcknowledgment} onChange={(e) => setD({ ...d, requiresAcknowledgment: e.target.checked })} />}
      </div>
    </Modal>
  );
}

function DocumentList({ scope }: { scope: 'company' | 'personal' }) {
  const { can } = useAccess();
  const manage = can(PERMISSIONS.DOCUMENT_MANAGE);
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const { data, isLoading } = useDocuments({ scope, category: category || undefined, search: search || undefined });
  const remove = useDeleteDocument();
  const [viewing, setViewing] = useState<HrDocument | null>(null);
  const [report, setReport] = useState<string | null>(null);

  return (
    <Card>
      <div className="flex flex-wrap gap-3 border-b border-border p-3">
        <div className="relative w-64"><Search className="absolute top-2.5 left-3 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Search documents" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <Select className="w-44" placeholder="All categories" value={category} onChange={(e) => setCategory(e.target.value)} options={enumOptions(CATEGORIES)} />
      </div>
      {isLoading && <Skeleton className="m-4 h-32" />}
      <ul className="divide-y divide-border">
        {data?.data.map((d) => (
          <li key={d.id} className="flex flex-wrap items-center gap-4 px-5 py-3.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-soft text-primary-soft-foreground"><FileText className="h-5 w-5" /></div>
            <button className="min-w-0 flex-1 cursor-pointer text-left" onClick={() => setViewing(d)}>
              <p className="text-sm font-medium hover:underline">{d.title}</p>
              <p className="text-xs text-muted-foreground">{humanize(d.category)} · v{d.version} · updated {formatDate(d.updatedAt)}{d.file && ` · ${d.file.originalName}`}</p>
            </button>
            {d.requiresAcknowledgment && (d.acknowledgedAt ? <Badge variant="success"><CheckCircle2 className="h-3 w-3" /> Acknowledged</Badge> : <Badge variant="warning"><ShieldAlert className="h-3 w-3" /> Action required</Badge>)}
            {manage && d.requiresAcknowledgment && <Button size="sm" variant="ghost" onClick={() => setReport(d.id)}><BarChart3 className="h-3.5 w-3.5" /> Report</Button>}
            {manage && <Button size="icon-sm" variant="ghost" aria-label="Delete document" onClick={async () => { await remove.mutateAsync(d.id); toast.success('Document removed'); }}><Trash2 className="h-3.5 w-3.5" /></Button>}
          </li>
        ))}
      </ul>
      {data && !data.data.length && <EmptyState icon={FileText} title={scope === 'personal' ? 'No personal documents yet' : 'No documents found'} />}
      {viewing && <DocumentViewer doc={viewing} onClose={() => setViewing(null)} />}
      {report && <AckReportModal id={report} onClose={() => setReport(null)} />}
    </Card>
  );
}

export function DocumentsPage() {
  const { can } = useAccess();
  const [tab, setTab] = useState('company');
  const [uploading, setUploading] = useState(false);
  return (
    <>
      <PageHeader title="Documents" description="Company policies, handbooks and your personal documents." actions={can(PERMISSIONS.DOCUMENT_MANAGE) && <Button onClick={() => setUploading(true)}><Plus className="h-4 w-4" /> Add document</Button>} />
      <Tabs className="mb-6" value={tab} onChange={setTab} tabs={[{ value: 'company', label: 'Company library' }, { value: 'personal', label: 'My documents' }]} />
      {tab === 'company' && <DocumentList scope="company" />}
      {tab === 'personal' && <DocumentList scope="personal" />}
      {uploading && <UploadModal onClose={() => setUploading(false)} />}
    </>
  );
}
