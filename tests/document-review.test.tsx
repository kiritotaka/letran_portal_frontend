import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { AxiosError } from 'axios';
import { useDocumentReview } from '../src/hooks/useDocumentReview';
import { documentReviewApi, type DocumentReview } from '../src/services/documentReviewApi';
import type { AnalysisJob } from '../src/services/documentAnalysisApi';

const job = { id: 'j1', status: 'completed', extracted_data: {
  fields: [{ name: 'contract_total', value: 1000, display_value: '1.000 đồng', status: 'extracted' }],
  missing_fields: ['acceptance_date', 'acceptance_date'], warnings: [],
} } as AnalysisJob;
const saved = { id: 'review1', request_id: 'r1', analysis_job_id: 'j1', revision: 1, confirmed: true,
  fields: [{ name: 'contract_total', value: 1000 }, { name: 'acceptance_date', value: '2026-09-09' }],
} as DocumentReview;
const file = { review_id: 'review1', revision: 1, filename: 'output.docx', download_url: 'https://example.com/output', expires_in: 300 };
let replace: ReturnType<typeof vi.fn>;
beforeEach(() => {
  replace = vi.fn();
  vi.spyOn(window, 'open').mockReturnValue({ opener: null, closed: false, close: vi.fn(), location: { replace } } as unknown as Window);
  vi.spyOn(documentReviewApi, 'get').mockResolvedValue(null);
  vi.spyOn(documentReviewApi, 'save').mockResolvedValue(undefined);
  vi.spyOn(documentReviewApi, 'export').mockResolvedValue(file);
  vi.spyOn(documentReviewApi, 'download').mockResolvedValue(file);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
async function mount(allowed = true) {
  const hook = renderHook(() => useDocumentReview('r1', job, allowed, 'owner'));
  await waitFor(() => expect(hook.result.current.ready).toBe(true));
  return hook;
}

it('saves then generates on the server without opening a tab, and downloads only on a separate action', async () => {
  const { result } = await mount();
  await act(async () => { await result.current.run(true); });
  expect(result.current.invalid).toEqual(['acceptance_date']);
  expect(documentReviewApi.save).not.toHaveBeenCalled();
  act(() => result.current.edit('acceptance_date', '   '));
  await act(async () => { await result.current.run(true); });
  expect(documentReviewApi.save).not.toHaveBeenCalled();
  act(() => result.current.edit('acceptance_date', ' 2026-09-09 '));
  await act(async () => { await result.current.run(true); });
  expect(documentReviewApi.save).not.toHaveBeenCalled();
  act(() => result.current.setConfirmed(true));
  vi.mocked(documentReviewApi.get).mockResolvedValue(saved);
  await act(async () => { await Promise.all([result.current.run(true), result.current.run(true)]); });
  expect(documentReviewApi.save).toHaveBeenCalledTimes(1);
  expect(documentReviewApi.save).toHaveBeenCalledWith('r1', {
    analysis_job_id: 'j1', expected_revision: 0, confirmed: true, fields: saved.fields,
  }, expect.any(String), expect.any(AbortSignal));
  expect(documentReviewApi.export).toHaveBeenCalledTimes(1);
  expect(documentReviewApi.export).toHaveBeenCalledWith('r1', 1, expect.any(AbortSignal));
  expect(documentReviewApi.download).not.toHaveBeenCalled();
  expect(window.open).not.toHaveBeenCalled();
  expect(result.current.saved).toBe(true);
  await act(async () => { await result.current.run(false); });
  expect(documentReviewApi.export).toHaveBeenCalledTimes(1);
  expect(documentReviewApi.save).toHaveBeenCalledTimes(1);
  expect(replace).toHaveBeenCalledWith(file.download_url);
});

it('retries server file creation without another PUT and never creates a file from download', async () => {
  const { result } = await mount();
  act(() => result.current.edit('acceptance_date', '2026-09-09'));
  act(() => result.current.setConfirmed(true));
  vi.mocked(documentReviewApi.get).mockResolvedValue(saved);
  vi.mocked(documentReviewApi.export).mockRejectedValueOnce(new Error('generation failed'));
  await act(async () => { await result.current.run(true); });
  expect(result.current.saved).toBe(true);
  expect(result.current.fileError).toBe(true);
  await act(async () => { await result.current.run(true); });
  expect(documentReviewApi.save).toHaveBeenCalledTimes(1);
  expect(documentReviewApi.export).toHaveBeenCalledTimes(2);
  expect(documentReviewApi.export).toHaveBeenLastCalledWith('r1', 1, expect.any(AbortSignal));
  expect(result.current.fileError).toBe(false);
  expect(window.open).not.toHaveBeenCalled();
  vi.mocked(documentReviewApi.download).mockRejectedValue(new AxiosError('Not found', undefined, undefined, undefined, { status: 404 } as any));
  await act(async () => { await result.current.run(false); });
  expect(documentReviewApi.export).toHaveBeenCalledTimes(2);
  expect(result.current.fileError).toBe(true);
});

it('restores review on reload, renews the link, and uses its revision for later edits', async () => {
  vi.mocked(documentReviewApi.get).mockResolvedValue({ ...saved, revision: 7 });
  vi.mocked(documentReviewApi.download).mockResolvedValue({ ...file, revision: 7 });
  const { result } = await mount();
  expect(result.current.value('acceptance_date', null)).toBe('2026-09-09');
  await act(async () => { await result.current.run(false); });
  expect(documentReviewApi.download).toHaveBeenCalledWith('r1', 7, expect.any(AbortSignal));
  expect(documentReviewApi.save).not.toHaveBeenCalled();
  expect(documentReviewApi.export).not.toHaveBeenCalled();
  act(() => result.current.edit('acceptance_date', '2026-09-10'));
  expect(result.current.saved).toBe(false);
  act(() => result.current.setConfirmed(true));
  vi.mocked(documentReviewApi.get).mockResolvedValue({ ...saved, revision: 8 });
  vi.mocked(documentReviewApi.export).mockResolvedValue({ ...file, revision: 8 });
  await act(async () => { await result.current.run(true); });
  expect(documentReviewApi.save).toHaveBeenCalledWith('r1', expect.objectContaining({ expected_revision: 7 }), expect.any(String), expect.any(AbortSignal));
  expect(documentReviewApi.export).toHaveBeenCalledWith('r1', 8, expect.any(AbortSignal));
});

it('keeps save available and retries the same payload with the same UUID after timeout', async () => {
  const { result } = await mount();
  act(() => result.current.edit('acceptance_date', '2026-09-09'));
  act(() => result.current.setConfirmed(true));
  vi.mocked(documentReviewApi.save).mockRejectedValue(new AxiosError('timeout', 'ECONNABORTED'));
  await act(async () => { await result.current.run(true); });
  expect(result.current.ready).toBe(true);
  expect(result.current.value('acceptance_date', null)).toBe('2026-09-09');
  await act(async () => { await result.current.run(true); });
  expect(documentReviewApi.save).toHaveBeenCalledTimes(2);
  const calls = vi.mocked(documentReviewApi.save).mock.calls;
  expect(calls[0][2]).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  expect(calls[1][2]).toBe(calls[0][2]);
  expect(calls[1][1]).toEqual(calls[0][1]);
  act(() => result.current.edit('acceptance_date', '2026-09-10'));
  act(() => result.current.setConfirmed(true));
  await act(async () => { await result.current.run(true); });
  expect(calls[2][2]).not.toBe(calls[0][2]);
  expect(documentReviewApi.export).not.toHaveBeenCalled();
});

it('refreshes a conflicting revision through save without losing edits or automatically overwriting', async () => {
  const { result } = await mount();
  act(() => result.current.edit('acceptance_date', '2026-09-10'));
  act(() => result.current.setConfirmed(true));
  vi.mocked(documentReviewApi.save).mockRejectedValue(new AxiosError('conflict', undefined, undefined, undefined, { status: 409 } as any));
  await act(async () => { await result.current.run(true); });
  vi.mocked(documentReviewApi.get).mockResolvedValue({ ...saved, revision: 3 });
  await act(async () => { await result.current.run(true); });
  expect(documentReviewApi.save).toHaveBeenCalledTimes(1);
  expect(result.current.review?.revision).toBe(3);
  expect(result.current.value('acceptance_date', null)).toBe('2026-09-10');
  expect(result.current.confirmed).toBe(false);
});

it('reports a network/CORS failure and preserves edits when rechecking the saved review', async () => {
  const { result } = await mount();
  act(() => result.current.edit('acceptance_date', '2026-09-09'));
  act(() => result.current.setConfirmed(true));
  vi.mocked(documentReviewApi.save).mockRejectedValue(new AxiosError('Network Error', 'ERR_NETWORK'));
  await act(async () => { await result.current.run(true); });
  expect(result.current.error).toContain('lỗi mạng hoặc CORS');
  expect(result.current.error).not.toContain('Phiên bản dữ liệu đã thay đổi');
  act(() => result.current.reload());
  await waitFor(() => expect(result.current.ready).toBe(true));
  expect(result.current.value('acceptance_date', null)).toBe('2026-09-09');
  expect(result.current.confirmed).toBe(false);
  expect(documentReviewApi.save).toHaveBeenCalledTimes(1);
});

it('retains saved review on export failure so download retry never writes review again', async () => {
  vi.mocked(documentReviewApi.get).mockResolvedValue(saved);
  vi.mocked(documentReviewApi.download).mockRejectedValue(new AxiosError('offline', 'ERR_NETWORK'));
  const { result } = await mount();
  await act(async () => { await result.current.run(false); });
  expect(result.current.saved).toBe(true);
  expect(result.current.error).toContain('chưa tải được file');
  expect(documentReviewApi.save).not.toHaveBeenCalled();
  expect(documentReviewApi.export).not.toHaveBeenCalled();
});

it('does not apply fields from a different analysis job or allow unauthorized writes', async () => {
  vi.mocked(documentReviewApi.get).mockResolvedValue({ ...saved, analysis_job_id: 'old-job' });
  const { result } = await mount(false);
  expect(result.current.value('acceptance_date', null)).toBeNull();
  expect(result.current.saved).toBe(false);
  await act(async () => { await result.current.run(true); });
  expect(documentReviewApi.save).not.toHaveBeenCalled();
});
