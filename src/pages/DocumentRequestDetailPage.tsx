import React from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, FileText, RefreshCw } from 'lucide-react';
import withAuthorization from '../components/guards/withAuthorization';
import DocumentAnalysisPanel from '../components/documents/DocumentAnalysisPanel';
import OutputTemplateLink from '../components/documents/OutputTemplateLink';
import { documentRequestApi } from '../services/documentRequestApi';
import type { CreatedRequestSummary, RequestFileLink } from '../services/documentWorkflowTypes';

const fileStatus = (status: string) => ({ uploading: 'Đang tải lên', uploaded: 'Đã tải lên', ready: 'Sẵn sàng', failed: 'Lỗi', error: 'Lỗi' }[status] || status);
function FileList({ files }: { files: RequestFileLink[] }) {
  return <ol className="divide-y divide-slate-100">{[...files].sort((a, b) => a.sort_order - b.sort_order).map((link, index) =>
    <li key={link.file_id} className="py-3 flex justify-between items-start gap-3 text-sm">
      <div className="min-w-0"><span className="break-all text-slate-800">{index + 1}. {link.file.original_name}</span>
        <span className="block text-xs text-slate-500 mt-1">{(link.file.size_bytes / 1024 / 1024).toFixed(2)} MiB · {link.file.content_type}</span></div>
      <span className="px-2 py-1 rounded-lg bg-slate-100 text-xs text-slate-600 shrink-0">{fileStatus(link.file.status)}</span>
    </li>)}</ol>;
}

function DocumentRequestDetailPageComponent() {
  const { requestId = '' } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const summary = (location.state as { summary?: CreatedRequestSummary } | null)?.summary;
  const selected = summary?.request.id === requestId ? summary : undefined;
  const requestQuery = useQuery({ queryKey: ['document-request', requestId],
    queryFn: ({ signal }) => documentRequestApi.getRequest(requestId, signal), enabled: Boolean(requestId),
    initialData: selected?.request, initialDataUpdatedAt: 0 });
  const documentsQuery = useQuery({ queryKey: ['document-request-documents', requestId],
    queryFn: ({ signal }) => documentRequestApi.listDocuments(requestId, signal), enabled: Boolean(requestId) });
  const filesQuery = useQuery({ queryKey: ['document-request-files', requestId],
    queryFn: ({ signal }) => documentRequestApi.files(requestId, signal), enabled: Boolean(requestId) });
  const request = requestQuery.data;
  const documents = documentsQuery.data ?? [];
  const files = filesQuery.data ?? [];
  const ungrouped = files.filter((file) => !documents.some((doc) => doc.id === file.document_id));
  const busy = requestQuery.isFetching || documentsQuery.isFetching || filesQuery.isFetching;
  const refresh = () => { void requestQuery.refetch(); void documentsQuery.refetch(); void filesQuery.refetch(); };
  return <div className="space-y-6">
    <div className="flex items-center justify-between gap-3">
      <button type="button" onClick={() => navigate('/documents')} className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-indigo-600"><ArrowLeft className="w-4 h-4" />Danh sách hồ sơ</button>
      <button type="button" onClick={refresh} disabled={busy} aria-label="Làm mới hồ sơ" className="p-2 bg-slate-100 rounded-xl text-slate-600 disabled:opacity-50"><RefreshCw className={`w-4 h-4 ${busy ? 'animate-spin' : ''}`} /></button>
    </div>
    {requestQuery.isError && <p role="alert" className="text-sm text-red-600">Không thể tải thông tin hồ sơ. <button type="button" onClick={() => requestQuery.refetch()} className="underline">Thử lại thông tin hồ sơ</button></p>}
    {requestQuery.isPending ? <p role="status" className="text-sm text-slate-500">Đang tải hồ sơ...</p> : request && <>
      <header className="bg-white p-5 rounded-2xl border border-slate-200 flex gap-3 items-center">
        <FileText className="w-6 h-6 text-indigo-600" />
        <div><h1 className="text-xl font-bold text-slate-900">{request.title}</h1><p className="mt-1 text-sm text-slate-500">{request.status}</p></div>
      </header>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white p-5 rounded-2xl border border-slate-200 text-sm">
        <div><dt className="text-slate-500">Mã hồ sơ</dt><dd className="font-mono break-all">{request.id}</dd></div>
        <div><dt className="text-slate-500">Tác vụ</dt><dd>{selected?.taskName || request.task_id}</dd></div>
        <div><dt className="text-slate-500">Mẫu đầu ra</dt><dd>{request.template_id ? <OutputTemplateLink key={requestId} requestId={requestId}
          name={selected?.templates?.find((t) => t.id === request.template_id)?.name} /> : 'Chưa có mẫu đầu ra'}</dd></div>
        <div><dt className="text-slate-500">Ngày tạo</dt><dd>{new Date(request.created_at).toLocaleString('vi-VN')}</dd></div>
      </dl>
    </>}
    <h2 className="text-sm font-bold text-slate-800 uppercase">Tài liệu đầu vào</h2>
    {documentsQuery.isPending && <p role="status" className="text-sm text-slate-500">Đang tải nhóm tài liệu...</p>}
    {documentsQuery.isError && <p role="alert" className="text-sm text-red-600">Không thể tải nhóm tài liệu. <button type="button" onClick={() => documentsQuery.refetch()} className="underline">Thử lại nhóm tài liệu</button></p>}
    {filesQuery.isPending && <p role="status" className="text-sm text-slate-500">Đang tải danh sách file...</p>}
    {filesQuery.isError && <p role="alert" className="text-sm text-red-600">Không thể tải danh sách file. <button type="button" onClick={() => filesQuery.refetch()} className="underline">Thử lại danh sách file</button></p>}
    {documentsQuery.isSuccess && !documents.length && <p className="text-sm text-slate-500">Hồ sơ chưa có nhóm tài liệu được lưu.</p>}
    {documents.map((document) => {
      const groupFiles = files.filter((file) => file.document_id === document.id);
      return <section key={document.id} aria-label={document.title} className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3">
        <div><h3 className="font-semibold text-slate-900">{document.title}</h3><p className="text-sm text-slate-500">{selected?.documentTypes?.find((t) => t.id === document.document_type_id)?.name || document.document_type_id}</p></div>
        <FileList files={groupFiles} />
        {filesQuery.isSuccess && !groupFiles.length && <p className="text-sm text-slate-500">Chưa có file được tải lên.</p>}
      </section>;
    })}
    {documentsQuery.isSuccess && ungrouped.length > 0 && <section className="bg-white p-5 rounded-2xl border border-slate-200"><h3 className="text-sm font-semibold text-slate-700">File chưa có nhóm tương ứng</h3><FileList files={ungrouped} /></section>}
    <DocumentAnalysisPanel key={requestId} requestId={requestId} request={request} files={files}
      inputsReady={requestQuery.isSuccess && filesQuery.isSuccess && !requestQuery.isFetching && !filesQuery.isFetching} />
  </div>;
}

export default withAuthorization(DocumentRequestDetailPageComponent, { requiredPermissions: ['DOC_VIEW', 'DOC_CREATE'] });
