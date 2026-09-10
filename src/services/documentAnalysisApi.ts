import axiosClient from './axiosClient';
import type { ApiPagination } from '../types';

export interface AnalysisSource { file_id: string; location: string; quote: string }
export interface AnalysisField {
  name: string;
  value: unknown;
  display_value?: unknown;
  status: 'extracted' | 'missing' | 'needs_input' | 'conflict';
  conflict: boolean;
  sources: AnalysisSource[];
}
export interface AnalysisJob {
  id: string;
  request_id: string;
  created_by: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  stage: string;
  model: string;
  schema_version: string;
  source_snapshot: Array<{ file_id: string; original_name: string; document_id: string; document_title: string; document_type: string; sort_order: number }>;
  extracted_data: { fields: AnalysisField[]; missing_fields: string[]; warnings: string[]; requires_review: boolean } | null;
  error_code: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
}
interface Envelope<T> { success: boolean; data: T; message?: string }
const config = { skipLoading: true, skipGlobalError: true };
function unwrap<T>(res: Envelope<T>) {
  if (!res.success) throw new Error(res.message || 'Không thể xử lý yêu cầu phân tích.');
  return res.data;
}
export const documentAnalysisApi = {
  history: async (requestId: string, signal?: AbortSignal) => unwrap(await axiosClient.get<
    Envelope<{ items: AnalysisJob[]; pagination: ApiPagination }>, Envelope<{ items: AnalysisJob[]; pagination: ApiPagination }>
  >(`/document-requests/${encodeURIComponent(requestId)}/jobs`, { ...config, params: { page: 1, page_size: 20 }, signal })),
  create: async (requestId: string, key: string, signal?: AbortSignal) => {
    const job = unwrap(await axiosClient.post<Envelope<AnalysisJob>, Envelope<AnalysisJob>>(
      `/document-requests/${encodeURIComponent(requestId)}/jobs`, undefined,
      { ...config, headers: { 'Idempotency-Key': key }, signal },
    ));
    if (!job?.id) throw new Error('Máy chủ chưa trả về ID phân tích. Thử lại với cùng yêu cầu.');
    return job;
  },
  detail: async (jobId: string, signal?: AbortSignal) => unwrap(await axiosClient.get<Envelope<AnalysisJob>, Envelope<AnalysisJob>>(
    `/document-jobs/${encodeURIComponent(jobId)}`, { ...config, signal },
  )),
};
export const isAnalysisRunning = (job?: AnalysisJob | null) => job?.status === 'queued' || job?.status === 'processing';
export function selectAnalysisJob(items: AnalysisJob[]) {
  const sorted = [...items].sort((a, b) => (Date.parse(b.created_at) || 0) - (Date.parse(a.created_at) || 0));
  return sorted.find((job) => isAnalysisRunning(job)) ?? sorted[0] ?? null;
}
