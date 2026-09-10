import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { AxiosError } from 'axios';
import { useDocumentAnalysis, ANALYSIS_POLL_MS } from '../src/hooks/useDocumentAnalysis';
import { documentAnalysisApi, selectAnalysisJob } from '../src/services/documentAnalysisApi';
import type { AnalysisJob } from '../src/services/documentAnalysisApi';
import DocumentAnalysisPanel from '../src/components/documents/DocumentAnalysisPanel';
import { useAuthStore } from '../src/stores/authStore';
import { axiosClient } from '../src/services/axiosClient';
import type { DocumentRequest } from '../src/types';
import type { RequestFileLink } from '../src/services/documentWorkflowTypes';

vi.mock('../src/context/AuthContext', () => ({ useAuth: () => useAuthStore() }));
const job = (status: AnalysisJob['status'] = 'queued', stage = status): AnalysisJob => ({
  id: 'j1', request_id: 'r1', created_by: 'owner', status, stage, model: 'model', schema_version: '1', source_snapshot: [], extracted_data: null,
  error_code: null, created_at: '2026-09-09T07:32:12Z', started_at: null, finished_at: null,
});
const history = (items: AnalysisJob[]) => ({ items, pagination: { page: 1, page_size: 20, total: items.length, total_pages: 1, has_next: false, has_previous: false } });
beforeEach(() => { sessionStorage.clear(); });
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); useAuthStore.getState().clearSession(); });
async function flush() { await act(async () => {}); }

it('loads history on mount and retrieves completed results without ever POSTing', async () => {
  const getHistory = vi.spyOn(documentAnalysisApi, 'history').mockResolvedValue(history([job('completed')]));
  const detail = vi.spyOn(documentAnalysisApi, 'detail').mockResolvedValue(job('completed'));
  const post = vi.spyOn(documentAnalysisApi, 'create');
  const { result, unmount } = renderHook(() => useDocumentAnalysis('r1', 'owner'));
  await waitFor(() => expect(result.current.job?.status).toBe('completed'));
  expect(detail).toHaveBeenCalledTimes(1);
  unmount(); renderHook(() => useDocumentAnalysis('r1', 'owner')); await flush();
  expect(getHistory).toHaveBeenCalledTimes(2);
  expect(post).not.toHaveBeenCalled();
});

it.each(['completed', 'failed'] as const)('prefers a running job, polls sequentially and stops on %s', async (terminal) => {
  vi.useFakeTimers();
  const active = { ...job(), id: 'active' };
  const latest = { ...job('completed'), id: 'latest', created_at: '2026-09-10T00:00:00Z' };
  expect(selectAnalysisJob([latest, active])?.id).toBe('active');
  vi.spyOn(documentAnalysisApi, 'history').mockResolvedValue(history([latest, active]));
  let resolve!: (value: AnalysisJob) => void;
  const detail = vi.spyOn(documentAnalysisApi, 'detail').mockImplementationOnce(() => new Promise((r) => { resolve = r; })).mockResolvedValue(job(terminal));
  const { result } = renderHook(() => useDocumentAnalysis('r1', 'owner')); await flush();
  await act(async () => { await vi.advanceTimersByTimeAsync(12000); });
  expect(detail).toHaveBeenCalledTimes(1);
  await act(async () => { resolve({ ...job('processing'), stage: 'reading_sources' }); });
  await act(async () => { await vi.advanceTimersByTimeAsync(ANALYSIS_POLL_MS - 1); });
  expect(detail).toHaveBeenCalledTimes(1);
  await act(async () => { await vi.advanceTimersByTimeAsync(1); });
  expect(detail).toHaveBeenCalledTimes(2);
  expect(result.current.job?.status).toBe(terminal);
  await act(async () => { await vi.advanceTimersByTimeAsync(16000); });
  expect(detail).toHaveBeenCalledTimes(2);
});

it('blocks creation when history cannot be loaded and recovers with GET only', async () => {
  vi.spyOn(documentAnalysisApi, 'history').mockRejectedValueOnce(new Error('offline')).mockResolvedValue(history([job('failed')]));
  const post = vi.spyOn(documentAnalysisApi, 'create');
  const detail = vi.spyOn(documentAnalysisApi, 'detail');
  const { result } = renderHook(() => useDocumentAnalysis('r1', 'owner')); await flush();
  expect(result.current.historyReady).toBe(false);
  await act(async () => { await result.current.create(); });
  expect(post).not.toHaveBeenCalled();
  await act(async () => { await result.current.reload(); });
  expect(result.current.job?.status).toBe('failed');
  expect(result.current.error).toBe('');
  expect(detail).not.toHaveBeenCalled();
  expect(post).not.toHaveBeenCalled();
});

it('reuses an uncertain POST key, blocks double clicks and uses a new key for an intentional rerun', async () => {
  vi.spyOn(documentAnalysisApi, 'history').mockResolvedValue(history([]));
  vi.spyOn(documentAnalysisApi, 'detail').mockResolvedValue({ ...job('failed'), error_code: 'SOURCE_INVALID' });
  const post = vi.spyOn(documentAnalysisApi, 'create').mockRejectedValueOnce(new AxiosError('timeout', 'ECONNABORTED')).mockResolvedValue(job());
  const { result } = renderHook(() => useDocumentAnalysis('r1', 'owner')); await flush();
  await act(async () => { await Promise.all([result.current.create(), result.current.create()]); });
  expect(post).toHaveBeenCalledTimes(1);
  expect(result.current.postError).toContain('timeout');
  await act(async () => { await result.current.create(); });
  expect(post.mock.calls[0][1]).toBe(post.mock.calls[1][1]);
  expect(result.current.job?.status).toBe('failed');
  await act(async () => { await result.current.create(); });
  expect(post.mock.calls[2][1]).not.toBe(post.mock.calls[1][1]);
});

it('preserves an uncertain key across remounts without automatically POSTing', async () => {
  vi.spyOn(documentAnalysisApi, 'history').mockResolvedValue(history([]));
  const post = vi.spyOn(documentAnalysisApi, 'create').mockRejectedValue(new AxiosError('offline', 'ERR_NETWORK'));
  const first = renderHook(() => useDocumentAnalysis('r1', 'owner')); await flush();
  await act(async () => { await first.result.current.create(); }); first.unmount();
  const second = renderHook(() => useDocumentAnalysis('r1', 'owner')); await flush();
  expect(post).toHaveBeenCalledTimes(1);
  await act(async () => { await second.result.current.create(); });
  expect(post.mock.calls[0][1]).toBe(post.mock.calls[1][1]);
});

it('cancels in-flight polling and ignores its late response after leaving the page', async () => {
  vi.useFakeTimers();
  vi.spyOn(documentAnalysisApi, 'history').mockResolvedValue(history([job()]));
  let resolve!: (value: AnalysisJob) => void;
  const detail = vi.spyOn(documentAnalysisApi, 'detail').mockImplementation(() => new Promise((r) => { resolve = r; }));
  const hook = renderHook(() => useDocumentAnalysis('r1', 'owner')); await flush();
  const signal = detail.mock.calls[0][1]; hook.unmount();
  expect(signal?.aborted).toBe(true);
  await act(async () => { resolve(job('processing')); await vi.advanceTimersByTimeAsync(20000); });
  expect(detail).toHaveBeenCalledTimes(1);
});

function login(permissions: string[], admin = false) {
  useAuthStore.getState().saveSession({ access_token: 'token', refresh_token: 'refresh', expires_in: 3600, expires_at: null,
    user: { id: 'owner', email: 'user@example.com', is_super_admin: admin, is_first_login: false, permissions } });
}
const request = { id: 'r1', status: 'draft' } as DocumentRequest;
const uploaded = { file: { status: 'uploaded' } } as RequestFileLink;

it('renders draft fields, conflicts and source quotes without edit/export controls', async () => {
  login(['DOC_VIEW']);
  const completed: AnalysisJob = { ...job('completed'), source_snapshot: [{ file_id: 'f1', original_name: 'hop-dong.pdf', document_id: 'd1', document_title: 'Hợp đồng', document_type: 'HD', sort_order: 1 }],
    extracted_data: { fields: [
      { name: 'contract_number', value: 'HD-01', status: 'extracted', conflict: false, sources: [{ file_id: 'f1', location: 'Trang 1', quote: 'Hợp đồng số HD-01' }] },
      { name: 'contract_date', value: '09/09/2026', status: 'conflict', conflict: true, sources: [] },
      { name: 'acceptance_date', value: null, status: 'needs_input', conflict: false, sources: [] },
      { name: 'amount', value: 0, status: 'extracted', conflict: false, sources: [] },
    ], missing_fields: ['address'], warnings: ['Kiểm tra ngày hợp đồng'], requires_review: true } };
  vi.spyOn(documentAnalysisApi, 'history').mockResolvedValue(history([completed]));
  vi.spyOn(documentAnalysisApi, 'detail').mockResolvedValue(completed);
  render(<DocumentAnalysisPanel requestId="r1" request={request} files={[uploaded]} inputsReady />);
  await screen.findByText('HD-01');
  expect(screen.getByText('Số hợp đồng')).toBeTruthy();
  expect(screen.getByText('Cần bổ sung')).toBeTruthy();
  expect(screen.getByText('Thông tin mâu thuẫn · Kiểm tra nguồn')).toBeTruthy();
  expect(screen.getByText('0', { selector: 'td' })).toBeTruthy();
  expect(screen.getByText('hop-dong.pdf')).toBeTruthy();
  expect(screen.getByText('Hợp đồng số HD-01')).toBeTruthy();
  expect(screen.getByText('Không tìm thấy')).toBeTruthy();
  expect(screen.queryByRole('button', { name: /Phân tích|Xuất|Lưu/ })).toBeNull();
});

it('allows DOC_UPDATE or super admins only when the draft has uploaded files and none uploading', async () => {
  login(['DOC_UPDATE']);
  vi.spyOn(documentAnalysisApi, 'history').mockResolvedValue(history([]));
  const panel = render(<DocumentAnalysisPanel requestId="r1" request={request} files={[]} inputsReady />); await flush();
  const button = screen.getByRole('button', { name: 'Phân tích tài liệu' }) as HTMLButtonElement;
  expect(button.disabled).toBe(true);
  panel.rerender(<DocumentAnalysisPanel requestId="r1" request={request} files={[uploaded, { file: { status: 'uploading' } } as RequestFileLink]} inputsReady />);
  expect(button.disabled).toBe(true);
  panel.rerender(<DocumentAnalysisPanel requestId="r1" request={{ ...request, status: 'completed' }} files={[uploaded]} inputsReady />);
  expect(button.disabled).toBe(true);
  panel.rerender(<DocumentAnalysisPanel requestId="r1" request={request} files={[uploaded]} inputsReady />);
  expect(button.disabled).toBe(false);
  act(() => login([], true)); expect(button.disabled).toBe(false);
  act(() => login(['DOC_VIEW'])); expect(screen.queryByRole('button', { name: 'Phân tích tài liệu' })).toBeNull();
});

it('sends the exact authenticated 202 POST without a body and reads nested envelopes', async () => {
  login(['DOC_UPDATE']);
  const seen: string[] = [];
  vi.spyOn(axiosClient.defaults, 'adapter', 'get').mockReturnValue(async (config) => {
    seen.push(axiosClient.getUri(config));
    expect(config.headers.Authorization).toBe('Bearer token');
    if (config.method === 'post') {
      expect(config.data).toBeUndefined(); expect(config.headers.get('Idempotency-Key')).toBe('stable-key');
    }
    return { config, status: config.method === 'post' ? 202 : 200, statusText: 'OK', headers: {}, data: { success: true, data: config.params ? history([job()]) : job() } };
  });
  expect((await documentAnalysisApi.history('r1')).items[0].id).toBe('j1');
  expect((await documentAnalysisApi.create('r1', 'stable-key')).id).toBe('j1');
  expect((await documentAnalysisApi.detail('j1')).id).toBe('j1');
  expect(seen).toEqual([
    'https://letran-portal-backend.onrender.com/api/v1/document-requests/r1/jobs?page=1&page_size=20',
    'https://letran-portal-backend.onrender.com/api/v1/document-requests/r1/jobs',
    'https://letran-portal-backend.onrender.com/api/v1/document-jobs/j1',
  ]);
});
