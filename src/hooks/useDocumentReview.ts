import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import type { AnalysisJob } from '../services/documentAnalysisApi';
import { documentReviewApi, type DocumentReview, type ReviewField } from '../services/documentReviewApi';

export const emptyReviewValue = (value: unknown) => value == null || (typeof value === 'string' && !value.trim());
export function reviewSaveError(failure: unknown): string {
  if (axios.isAxiosError(failure)) {
    if (failure.code === 'ECONNABORTED' || failure.code === 'ETIMEDOUT')
      return 'Hết thời gian chờ phản hồi lưu. Chưa xác định được hồ sơ đã lưu hay chưa.';
    if (!failure.response)
      return 'Không nhận được phản hồi lưu từ máy chủ (lỗi mạng hoặc CORS). Chưa xác định được hồ sơ đã lưu hay chưa.';
    if (failure.response.status === 409)
      return 'Phiên bản dữ liệu đã thay đổi. Cần tải lại phiên bản hiện tại trước khi lưu tiếp.';
    const data = failure.response.data;
    const detail = data?.error?.message || data?.message || (typeof data?.detail === 'string' ? data.detail : undefined);
    return `Máy chủ từ chối lưu (HTTP ${failure.response.status}).${typeof detail === 'string' ? ` ${detail}` : ''}`;
  }
  return 'Chưa xác nhận được kết quả lưu.';
}
export function reviewFields(job: AnalysisJob): ReviewField[] {
  const fields = new Map((job.extracted_data?.fields ?? []).map((field) => [field.name, { name: field.name, value: field.value }]));
  for (const name of job.extracted_data?.missing_fields ?? []) if (!fields.has(name)) fields.set(name, { name, value: null });
  return [...fields.values()];
}

export function useDocumentReview(requestId: string, job: AnalysisJob | null, allowed: boolean, ownerId: string) {
  const [review, setReview] = useState<DocumentReview | null>(null);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [fileError, setFileError] = useState(false);
  const [invalid, setInvalid] = useState<string[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [reload, setReload] = useState(0);
  const lock = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const tabRef = useRef<Window | null>(null);
  const access = useRef(allowed);
  access.current = allowed;
  const jobId = job?.status === 'completed' ? job.id : '';
  const previousScope = useRef('');
  const pendingSave = useRef<{ signature: string; key: string } | null>(null);
  const needsRevision = useRef(false);

  useEffect(() => {
    const abort = new AbortController(); abortRef.current = abort;
    lock.current = false; setBusy(false); setReady(false); setReview(null);
    const scope = JSON.stringify([requestId, jobId, ownerId]);
    // Rechecking an uncertain save must not discard what the user typed.
    if (previousScope.current !== scope) {
      setEdits({}); pendingSave.current = null; needsRevision.current = false;
    }
    previousScope.current = scope;
    setError(''); setMessage(''); setInvalid([]); setConfirmed(false); setFileError(false);
    if (jobId) void documentReviewApi.get(requestId, abort.signal).then((data) => {
      if (!abort.signal.aborted) { setReview(data); setReady(true); }
    }).catch(() => {
      if (!abort.signal.aborted) setError('Không thể tải dữ liệu đã lưu. Vui lòng tải lại trước khi chỉnh sửa.');
    });
    return () => { abort.abort(); tabRef.current?.close(); tabRef.current = null; };
  }, [requestId, jobId, ownerId, reload]);

  const current = review?.analysis_job_id === jobId ? review : null;
  const fields = job ? reviewFields(job) : [];
  const savedValues = new Map(current?.fields.map((field) => [field.name, field.value]));
  const value = (name: string, fallback: unknown) => Object.hasOwn(edits, name) ? edits[name]
    : savedValues.has(name) ? savedValues.get(name) : fallback;
  const changed = Object.keys(edits).length > 0;
  const saved = Boolean(current?.confirmed && !changed && fields.length && fields.every((field) =>
    savedValues.has(field.name) && !emptyReviewValue(savedValues.get(field.name))));
  const edit = (name: string, text: string) => {
    if (!ready || lock.current || !access.current) return;
    setEdits((previous) => ({ ...previous, [name]: text })); setConfirmed(false); setMessage('');
    setInvalid((previous) => previous.filter((field) => field !== name));
  };
  const openDownload = (url: string) => {
    const parsed = new URL(url);
    if (!['https:', 'http:'].includes(parsed.protocol)) throw new Error('Đường dẫn tải file không hợp lệ.');
    const tab = tabRef.current;
    if (tab && !tab.closed) tab.location.replace(parsed.href);
    else window.location.assign(parsed.href);
    tabRef.current = null;
  };
  const run = async (save: boolean) => {
    if (lock.current || !ready || !access.current || !jobId || !job?.extracted_data) return;
    const payload = fields.map((field) => {
      const result = value(field.name, field.value);
      return { name: field.name, value: typeof result === 'string' ? result.trim() : result };
    });
    const missing = payload.filter((field) => emptyReviewValue(field.value)).map((field) => field.name);
    setInvalid(missing); setError(''); setMessage('');
    if (!payload.length || missing.length) { setError('Vui lòng nhập đầy đủ các trường thông tin trước khi lưu.'); return; }
    if (save && !saved && !confirmed) { setError('Vui lòng xác nhận đã kiểm tra thông tin trước khi lưu.'); return; }
    if (!save && !saved) return;
    lock.current = true; setBusy(true);
    const signal = abortRef.current!.signal;
    const tab = save ? null : window.open('about:blank', '_blank');
    if (tab) tab.opener = null;
    tabRef.current = tab;
    let creatingFile = false;
    try {
      let stored = current;
      if (save && !saved) {
        if (needsRevision.current) {
          const latest = await documentReviewApi.get(requestId, signal);
          if (signal.aborted || !access.current) return;
          setReview(latest); needsRevision.current = false; pendingSave.current = null;
          setConfirmed(false);
          setMessage('Đã cập nhật phiên bản hiện tại và giữ thông tin vừa nhập. Vui lòng kiểm tra, xác nhận rồi bấm Lưu thông tin.');
          return;
        }
        setMessage('Đang lưu thông tin…');
        const body = { analysis_job_id: jobId, expected_revision: review?.revision ?? 0, confirmed: true, fields: payload };
        const signature = JSON.stringify(body);
        if (pendingSave.current?.signature !== signature) pendingSave.current = { signature, key: crypto.randomUUID() };
        await documentReviewApi.save(requestId, body, pendingSave.current.key, signal);
        if (signal.aborted || !access.current) return;
        stored = await documentReviewApi.get(requestId, signal);
        if (signal.aborted || !access.current) return;
        if (!stored?.confirmed || stored.analysis_job_id !== jobId || stored.revision <= (review?.revision ?? -1)) {
          throw new Error('Chưa xác nhận được phiên bản đã lưu. Vui lòng tải lại dữ liệu.');
        }
        setReview(stored); setEdits({}); setConfirmed(false);
        pendingSave.current = null;
      }
      if (!stored) throw new Error('Chưa có dữ liệu đã lưu.');
      if (save) {
        creatingFile = true;
        setMessage('Đã lưu thông tin. Đang tạo file trên máy chủ…');
        const generated = await documentReviewApi.export(requestId, stored.revision, signal);
        if (signal.aborted || !access.current) return;
        if (generated.revision !== stored.revision || generated.review_id !== stored.id) throw new Error('Phiên bản xuất đã thay đổi.');
        setFileError(false);
        setMessage('Đã lưu thông tin và tạo file trên máy chủ. Bấm “Xuất file” để tải về.');
        return;
      }
      setMessage('Thông tin đã lưu. Đang chuẩn bị file…');
      const exported = await documentReviewApi.download(requestId, stored.revision, signal);
      if (signal.aborted || !access.current) return;
      if (exported.revision !== stored.revision || exported.review_id !== stored.id) throw new Error('Phiên bản xuất đã thay đổi. Vui lòng tải lại dữ liệu.');
      openDownload(exported.download_url);
      setMessage('Đã mở file tải về.');
    } catch (failure) {
      if (signal.aborted) return;
      if (creatingFile) {
        setFileError(true);
        setError('Thông tin đã lưu, nhưng chưa tạo được file trên máy chủ. Bấm “Thử lại tạo file”; không cần lưu lại thông tin.');
      } else if (save) {
        if (axios.isAxiosError(failure) && failure.response?.status === 409) needsRevision.current = true;
        setError(`${reviewSaveError(failure)} Thông tin vừa nhập được giữ lại. Bấm “Lưu thông tin” để thử lại${needsRevision.current ? ' và lấy phiên bản hiện tại' : ''}.`);
      } else {
        if (axios.isAxiosError(failure) && failure.response?.status === 404) setFileError(true);
        setError('Thông tin đã lưu, nhưng chưa tải được file. Nếu file chưa được tạo, bấm “Thử lại tạo file”.');
      }
      setMessage('');
    } finally {
      tabRef.current?.close(); tabRef.current = null;
      if (!signal.aborted) { lock.current = false; setBusy(false); }
    }
  };
  return { review: current, ready, busy, error, message, fileError, invalid, confirmed, setConfirmed, saved, edit, value,
    edits, run, reload: () => { if (!lock.current) setReload((n) => n + 1); } };
}
