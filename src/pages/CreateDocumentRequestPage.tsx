import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, FilePlus2, Plus } from 'lucide-react';
import withAuthorization from '../components/guards/withAuthorization';
import RequestDocumentEditor from '../components/documents/RequestDocumentEditor';
import { useAuth } from '../context/AuthContext';
import { documentRequestApi } from '../services/documentRequestApi';
import { DocumentWorkflow } from '../services/documentWorkflow';
import { MAX_REQUEST_FILES, newGroup, queueFiles, validateDraft } from '../services/documentQueue';
import type { CreatedRequestSummary, InputDocumentGroup, WorkflowSnapshot } from '../services/documentWorkflowTypes';
import { QUERY_KEYS } from '../hooks/useApiQueries';

const inputClass = 'w-full mt-1 px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:text-slate-500';

function CreateDocumentRequestPageComponent() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, hasPermission } = useAuth();
  const access = useRef({ userId: user?.id, allowed: hasPermission('DOC_CREATE') });
  access.current = { userId: user?.id, allowed: hasPermission('DOC_CREATE') };
  const tasksQuery = useQuery({ queryKey: ['document-tasks'], queryFn: ({ signal }) => documentRequestApi.tasks(signal) });
  const typesQuery = useQuery({ queryKey: ['document-types', 'all'], queryFn: ({ signal }) => documentRequestApi.types(signal) });
  const tasks = (tasksQuery.data ?? []).filter((task) => task.is_active);
  const [title, setTitle] = useState('');
  const [selectedTask, setSelectedTask] = useState('');
  const taskId = selectedTask || (tasks.length === 1 ? tasks[0].id : '');
  const templatesQuery = useQuery({ queryKey: ['document-task-templates', taskId],
    queryFn: ({ signal }) => documentRequestApi.templates(taskId, signal), enabled: Boolean(taskId) });
  const [groups, setGroups] = useState<InputDocumentGroup[]>(() => [newGroup()]);
  const [errors, setErrors] = useState<string[]>([]);
  const [snapshot, setSnapshot] = useState<WorkflowSnapshot>();
  const workflow = useRef<DocumentWorkflow | null>(null);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const displayedGroups = snapshot?.groups ?? groups;
  const fileCount = displayedGroups.reduce((n, group) => n + group.files.length, 0);
  const locked = Boolean(snapshot);
  const busy = snapshot?.busy ?? false;

  useEffect(() => {
    if (!fileCount || workflow.current?.complete) return;
    const onUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, [fileCount, busy]);

  const leave = () => {
    if (busy) return;
    if ((fileCount || locked) && !window.confirm('Rời trang? File đang chờ sẽ không được giữ lại. Hồ sơ và file đã lưu vẫn được giữ trên máy chủ.')) return;
    navigate('/documents');
  };
  const openSaved = (state: WorkflowSnapshot) => {
    if (!state.request) return;
    const summary: CreatedRequestSummary = {
      request: state.request,
      taskName: tasks.find((task) => task.id === state.taskId)?.name,
      templates: templatesQuery.data,
      documentTypes: typesQuery.data,
      groups: state.groups.flatMap((group) => group.document ? [{ document: group.document,
        files: group.files.map((entry) => ({ name: entry.file.name, status: entry.stage, saved: entry.saved })) }] : []),
    };
    navigate(`/documents/${encodeURIComponent(state.request.id)}`, { state: { summary } });
  };
  const save = async (fileId?: string) => {
    if (workflow.current?.state.busy || !access.current.allowed) return;
    if (!workflow.current) {
      const error = validateDraft({ title, taskId, groups });
      if (error) { setErrors([error]); return; }
      if (tasksQuery.isPending || typesQuery.isPending || tasksQuery.isError || typesQuery.isError) return;
      if (!tasks.some((task) => task.id === taskId) || groups.some((g) => !typesQuery.data?.some((type) => type.id === g.documentTypeId && type.is_active))) {
        setErrors(['Tác vụ hoặc loại tài liệu không còn hoạt động. Vui lòng chọn lại.']); return;
      }
      const ownerId = user?.id;
      workflow.current = new DocumentWorkflow({ title, taskId, groups }, documentRequestApi,
        (state) => { if (mounted.current) setSnapshot(state); },
        () => {
          if (!mounted.current || access.current.userId !== ownerId || !access.current.allowed) throw new Error('Phiên làm việc đã thay đổi. Dừng lưu hồ sơ.');
        }, ownerId);
    }
    setErrors([]);
    await workflow.current.save(fileId);
    if (workflow.current.state.request) queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.DOCUMENTS] });
    if (mounted.current && workflow.current.complete) openSaved(workflow.current.state);
  };
  const addFiles = (groupId: string, files: File[]) => {
    if (locked) return;
    const queued = queueFiles(files, fileCount);
    setErrors(queued.errors);
    setGroups((previous) => previous.map((g) => g.localId === groupId ? { ...g, files: [...g.files, ...queued.files] } : g));
  };

  return <div className="max-w-6xl mx-auto space-y-4">
    <button type="button" onClick={leave} disabled={busy} className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-indigo-600 disabled:opacity-50"><ArrowLeft className="w-4 h-4" />Danh sách hồ sơ</button>
    <header className="flex items-center gap-3">
      <div className="p-3 rounded-xl bg-indigo-100 text-indigo-600"><FilePlus2 className="w-5 h-5" /></div>
      <div><h1 className="text-xl font-bold text-slate-900">Tạo hồ sơ tài liệu</h1><p className="text-sm text-slate-500 mt-1">Chọn tác vụ và sắp xếp tài liệu đầu vào trước khi lưu.</p></div>
    </header>
    <form onSubmit={(event) => { event.preventDefault(); void save(); }} className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
      <fieldset disabled={locked} className="lg:col-span-2 bg-white p-4 rounded-2xl border border-slate-200 space-y-3">
        <legend className="sr-only">Thông tin hồ sơ</legend>
        <h2 className="text-sm font-semibold text-slate-900">Thông tin hồ sơ</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block text-sm font-medium text-slate-700">Tên hồ sơ <span className="text-red-500">*</span>
          <input required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Nghiệm thu ETEC" className={inputClass} />
        </label>
        <label className="block text-sm font-medium text-slate-700">Tác vụ <span className="text-red-500">*</span>
          <select required value={taskId} disabled={locked || tasksQuery.isPending || tasksQuery.isError} onChange={(event) => setSelectedTask(event.target.value)} className={inputClass}>
            <option value="">{tasksQuery.isPending ? 'Đang tải tác vụ...' : 'Chọn tác vụ'}</option>
            {tasks.map((task) => <option key={task.id} value={task.id}>{task.name}</option>)}
          </select>
        </label>
        </div>
        {tasksQuery.isError && <p role="alert" className="text-sm text-red-600">Không thể tải tác vụ. <button type="button" onClick={() => tasksQuery.refetch()} className="underline">Tải lại tác vụ</button></p>}
        {tasksQuery.isSuccess && !tasks.length && <p className="text-sm text-amber-700">Chưa có tác vụ đang hoạt động.</p>}
      </fieldset>
      <section className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl space-y-2" aria-label="Mẫu đầu ra">
        <h2 className="text-sm font-semibold text-slate-900">Mẫu đầu ra</h2>
        {!taskId ? <p className="text-sm text-slate-500">Chọn tác vụ để xem mẫu đầu ra.</p>
          : templatesQuery.isPending ? <p role="status" className="text-sm text-slate-500">Đang tải mẫu đầu ra...</p>
          : templatesQuery.isError ? <p role="alert" className="text-sm text-amber-700">Không thể tải thông tin mẫu. <button type="button" onClick={() => templatesQuery.refetch()} className="underline">Tải lại mẫu</button></p>
          : !templatesQuery.data?.length ? <p className="text-sm text-slate-500">Chưa có mẫu đầu ra cho tác vụ này.</p>
          : templatesQuery.data.map((template) => <div key={template.id}>
            <p className="text-sm font-medium text-slate-800">{template.name}</p>
            <p className="text-xs text-slate-500 mt-1">Phiên bản {template.version} · {template.is_active ? 'Đang hoạt động' : 'Chưa sẵn sàng xuất'}</p>
          </div>)}
        <p className="text-xs text-slate-500">Bạn vẫn có thể lưu hồ sơ và tải tài liệu khi mẫu chưa sẵn sàng xuất.</p>
      </section>
      </div>
      <section className="space-y-3" aria-labelledby="input-documents-title">
        <div className="flex flex-wrap items-center justify-between gap-2"><h2 id="input-documents-title" className="text-sm font-semibold text-slate-800">Tài liệu đầu vào</h2><span className="text-xs text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full">{displayedGroups.length} nhóm · {fileCount}/{MAX_REQUEST_FILES} file</span></div>
        {typesQuery.isPending && <p role="status" className="text-sm text-slate-500">Đang tải loại tài liệu...</p>}
        {typesQuery.isError && <p role="alert" className="text-sm text-red-600">Không thể tải loại tài liệu. <button type="button" onClick={() => typesQuery.refetch()} className="underline">Tải lại loại tài liệu</button></p>}
        {typesQuery.isSuccess && !typesQuery.data.some((type) => type.is_active) && <p className="text-sm text-amber-700">Chưa có loại tài liệu đang hoạt động.</p>}
        {displayedGroups.map((group, index) => <RequestDocumentEditor key={group.localId} group={group} index={index} types={typesQuery.data ?? []} locked={locked} busy={busy}
          onChange={(changed) => setGroups((previous) => previous.map((g) => g.localId === changed.localId ? changed : g))}
          onFiles={(files) => addFiles(group.localId, files)} onRemove={() => setGroups((previous) => previous.filter((g) => g.localId !== group.localId))}
          onRetry={(fileId) => { void save(fileId); }} />)}
        {!locked && <button type="button" onClick={() => setGroups((previous) => [...previous, newGroup()])} className="inline-flex items-center gap-2 text-sm text-indigo-700 font-medium px-4 py-2 bg-indigo-50 rounded-xl"><Plus className="w-4 h-4" />Thêm tài liệu khác</button>}
      </section>
      {errors.length > 0 && <div role="alert" className="p-4 bg-red-50 text-red-700 rounded-xl text-sm space-y-1">{errors.map((error, index) => <p key={index}>{error}</p>)}</div>}
      {snapshot && <div className="p-4 bg-slate-100 rounded-xl space-y-2">
        <p role="status" aria-live="polite" className="text-sm text-slate-700">{snapshot.message}</p>
        {snapshot.error && <p role="alert" className="text-sm text-red-600">{snapshot.error}</p>}
        {snapshot.request && <p className="text-xs text-slate-500">Hồ sơ đã được tạo: {snapshot.request.title}</p>}
      </div>}
      <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-end gap-2 border border-slate-200 bg-white/95 backdrop-blur-sm p-3 rounded-2xl shadow-sm">
        <span className="mr-auto text-xs text-slate-500">{fileCount} file trong {displayedGroups.length} nhóm tài liệu</span>
        <button type="button" onClick={leave} disabled={busy} className="px-4 py-2 rounded-xl text-sm bg-white border border-slate-200 text-slate-600 disabled:opacity-50">Hủy</button>
        {snapshot?.request && !busy && <button type="button" onClick={() => openSaved(snapshot)} className="px-4 py-2 rounded-xl text-sm text-indigo-700 border border-indigo-200 bg-white">Mở hồ sơ đã lưu</button>}
        <button type="submit" disabled={busy || tasksQuery.isPending || tasksQuery.isError || typesQuery.isPending || typesQuery.isError || !tasks.length}
          className="px-5 py-2 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50">
          {busy ? 'Đang lưu hồ sơ...' : locked ? 'Thử lại phần chưa hoàn tất' : 'Lưu hồ sơ'}
        </button>
      </div>
    </form>
  </div>;
}

export default withAuthorization(CreateDocumentRequestPageComponent, 'DOC_CREATE');
