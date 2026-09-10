import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { documentAnalysisApi, isAnalysisRunning, selectAnalysisJob } from '../services/documentAnalysisApi';
import type { AnalysisJob } from '../services/documentAnalysisApi';
import { workflowError } from '../services/documentWorkflow';

export const ANALYSIS_POLL_MS = 4000;

export function useDocumentAnalysis(requestId: string, ownerId: string) {
  const [job, setJob] = useState<AnalysisJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [postError, setPostError] = useState('');
  const [historyReady, setHistoryReady] = useState(false);
  const jobRef = useRef<AnalysisJob | null>(null);
  const busyPost = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const poll = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const generation = useRef(0);
  const keyRef = useRef<string | null>(null);
  const storageKey = `document-analysis-pending:${ownerId}:${requestId}`;
  const stop = () => { clearTimeout(poll.current); controller.current?.abort(); };
  const rememberKey = (key: string | null) => {
    keyRef.current = key;
    try { if (key) sessionStorage.setItem(storageKey, key); else sessionStorage.removeItem(storageKey); } catch { /* Retain in memory if storage is unavailable. */ }
  };
  const acceptJob = (next: AnalysisJob | null) => { jobRef.current = next; setJob(next); };

  const follow = async (jobId: string, version: number, signal: AbortSignal) => {
    if (signal.aborted || generation.current !== version) return;
    try {
      const next = await documentAnalysisApi.detail(jobId, signal);
      if (signal.aborted || generation.current !== version) return;
      acceptJob(next); setError('');
      if (isAnalysisRunning(next)) poll.current = setTimeout(() => { void follow(jobId, version, signal); }, ANALYSIS_POLL_MS);
    } catch (failure) {
      if (signal.aborted || generation.current !== version) return;
      setError(`Chưa lấy được tiến độ phân tích. ${workflowError(failure)}`);
      const status = axios.isAxiosError(failure) ? failure.response?.status : undefined;
      if (![401, 403, 404].includes(status ?? 0)) poll.current = setTimeout(() => { void follow(jobId, version, signal); }, ANALYSIS_POLL_MS);
    }
  };

  const loadHistory = async () => {
    if (busyPost.current) return;
    stop();
    const version = ++generation.current;
    const abort = new AbortController(); controller.current = abort;
    setLoading(true); setHistoryReady(false); setError('');
    try {
      const history = await documentAnalysisApi.history(requestId, abort.signal);
      if (abort.signal.aborted || generation.current !== version) return;
      const selected = selectAnalysisJob(history.items);
      acceptJob(selected); setHistoryReady(true);
      if (isAnalysisRunning(selected)) { rememberKey(null); setPostError(''); }
      if (selected && selected.status !== 'failed') void follow(selected.id, version, abort.signal);
    } catch (failure) {
      if (!abort.signal.aborted && generation.current === version) setError(`Không thể tải lịch sử phân tích. ${workflowError(failure)}`);
    } finally { if (!abort.signal.aborted && generation.current === version) setLoading(false); }
  };

  useEffect(() => {
    try { keyRef.current = sessionStorage.getItem(storageKey); } catch { keyRef.current = null; }
    setPostError(keyRef.current ? 'Lần gửi trước chưa xác định được kết quả. Thử lại sẽ dùng cùng mã yêu cầu.' : '');
    busyPost.current = false; setCreating(false); acceptJob(null);
    void loadHistory();
    return () => { ++generation.current; stop(); };
  }, [requestId, ownerId]);

  const create = async () => {
    if (busyPost.current || loading || !historyReady || isAnalysisRunning(jobRef.current)) return;
    busyPost.current = true; setCreating(true); setPostError('');
    stop();
    const version = ++generation.current;
    const abort = new AbortController(); controller.current = abort;
    const key = keyRef.current ?? crypto.randomUUID(); rememberKey(key);
    try {
      const next = await documentAnalysisApi.create(requestId, key, abort.signal);
      if (abort.signal.aborted || generation.current !== version) return;
      rememberKey(null); acceptJob(next); setError('');
      if (next.status !== 'failed') void follow(next.id, version, abort.signal);
    } catch (failure) {
      if (!abort.signal.aborted && generation.current === version) setPostError(`Chưa tạo được lần phân tích. ${workflowError(failure)}`);
    } finally {
      if (generation.current === version) { busyPost.current = false; setCreating(false); }
    }
  };
  return { job, loading, creating, error, postError, historyReady, running: isAnalysisRunning(job), create, reload: loadHistory };
}
