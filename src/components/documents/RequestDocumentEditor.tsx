import React from 'react';
import { ArrowDown, ArrowUp, Upload, X } from 'lucide-react';
import type { DocumentTypeListItem } from '../../types';
import type { InputDocumentGroup } from '../../services/documentWorkflowTypes';
import { FILE_ACCEPT } from '../../services/documentQueue';

const stageLabels = { queued: 'Chờ lưu', uploading: 'Đang tải lên', saving: 'Đang lưu', complete: 'Hoàn tất', error: 'Lỗi' };
const inputClass = 'w-full px-3 py-2 mt-1 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50';

export default function RequestDocumentEditor({ group, index, types, locked, busy, onChange, onFiles, onRemove, onRetry }: {
  group: InputDocumentGroup; index: number; types: DocumentTypeListItem[]; locked: boolean; busy: boolean;
  onChange: (group: InputDocumentGroup) => void; onFiles: (files: File[]) => void;
  onRemove: () => void; onRetry: (fileId?: string) => void;
}) {
  const move = (from: number, delta: number) => {
    if (locked || from + delta < 0 || from + delta >= group.files.length) return;
    const files = [...group.files];
    [files[from], files[from + delta]] = [files[from + delta], files[from]];
    onChange({ ...group, files });
  };
  return <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden" aria-label={`Tài liệu ${index + 1}`}>
    <div className="px-4 py-2.5 flex justify-between items-center border-b border-slate-100 bg-slate-50">
      <h3 className="font-semibold text-sm text-slate-900">Tài liệu {index + 1}<span className="ml-2 text-xs font-normal text-slate-500">{group.files.length} file</span></h3>
      {!locked && <button type="button" onClick={onRemove} className="text-xs text-red-600 hover:underline inline-flex items-center gap-1"><X className="w-3 h-3" />Bỏ nhóm</button>}
    </div>
    <div className="p-4 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="text-sm font-medium text-slate-700">Tên tài liệu <span className="text-red-500">*</span>
          <input required value={group.title} disabled={locked} onChange={(e) => onChange({ ...group, title: e.target.value })}
            placeholder="Ví dụ: Hợp đồng chính" className={inputClass} />
        </label>
        <label className="text-sm font-medium text-slate-700">Loại tài liệu <span className="text-red-500">*</span>
          <select required value={group.documentTypeId} disabled={locked} onChange={(e) => onChange({ ...group, documentTypeId: e.target.value })} className={inputClass}>
            <option value="">Chọn loại tài liệu</option>
            {types.map((type) => <option key={type.id} value={type.id} disabled={!type.is_active}>{type.name}{type.is_active ? '' : ' — Ngừng hoạt động'}</option>)}
          </select>
        </label>
      </div>
      {!locked && <label className="flex items-center gap-3 p-3 border border-dashed border-indigo-200 bg-indigo-50/40 rounded-xl cursor-pointer hover:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-500"
        onDragOver={(event) => { event.preventDefault(); }}
        onDrop={(event) => { event.preventDefault(); if (!locked) onFiles(Array.from(event.dataTransfer.files)); }}>
        <Upload className="w-5 h-5 shrink-0 text-indigo-600" />
        <div className="min-w-0">
        <span className="text-sm font-medium text-indigo-700">Kéo thả hoặc chọn nhiều file</span>
        <span className="block text-xs text-slate-500 mt-1">JPG, PNG, PDF, DOCX · Tối đa 10 MiB/file</span>
        </div>
        <input type="file" multiple accept={FILE_ACCEPT} aria-label={`Chọn file tài liệu ${index + 1}`} className="sr-only"
          onChange={(event) => { onFiles(Array.from(event.target.files ?? [])); event.target.value = ''; }} />
      </label>}
      <ol className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
        {group.files.map((entry, position) => <li key={entry.localId} className="py-2 space-y-1">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0"><span className="text-sm text-slate-800 break-all">{position + 1}. {entry.file.name}</span>
              <span className="block text-xs text-slate-500">{(entry.file.size / 1024 / 1024).toFixed(2)} MiB · {stageLabels[entry.stage]}{entry.stage === 'uploading' ? ` ${entry.progress}%` : ''}</span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {!locked && <>
                <button type="button" aria-label={`Đưa ${entry.file.name} lên`} disabled={position === 0} onClick={() => move(position, -1)} className="p-2 bg-slate-100 rounded-lg disabled:opacity-30"><ArrowUp className="w-3 h-3" /></button>
                <button type="button" aria-label={`Đưa ${entry.file.name} xuống`} disabled={position === group.files.length - 1} onClick={() => move(position, 1)} className="p-2 bg-slate-100 rounded-lg disabled:opacity-30"><ArrowDown className="w-3 h-3" /></button>
                <button type="button" aria-label={`Bỏ ${entry.file.name}`} onClick={() => onChange({ ...group, files: group.files.filter((f) => f.localId !== entry.localId) })} className="px-2 py-1 text-xs text-red-600">Bỏ</button>
              </>}
              {entry.stage === 'error' && <button type="button" disabled={busy} onClick={() => onRetry(entry.localId)} className="px-3 py-1 text-xs font-medium text-indigo-700 bg-indigo-50 rounded-lg disabled:opacity-50">Thử lại</button>}
            </div>
          </div>
          {(entry.stage === 'uploading' || entry.stage === 'saving') && <progress aria-label={`Tiến độ ${entry.file.name}`} max={100} value={entry.progress} className="w-full h-2 accent-indigo-600" />}
          {entry.error && <p role="alert" className="text-xs text-red-600">{entry.error}</p>}
        </li>)}
      </ol>
      {group.error && <div role="alert" className="text-sm text-red-600">{group.error} <button type="button" disabled={busy} onClick={() => onRetry()} className="underline disabled:opacity-50">Thử lại nhóm</button></div>}
    </div>
  </section>;
}
