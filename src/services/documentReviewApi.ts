import axios from 'axios';
import axiosClient from './axiosClient';

export interface ReviewField { name: string; value: unknown }
export interface DocumentReview {
  id: string; request_id: string; analysis_job_id: string; revision: number;
  confirmed: boolean; fields: ReviewField[]; template_id: string; created_by: string; created_at: string;
}
export interface ReviewPayload {
  analysis_job_id: string; expected_revision: number; confirmed: boolean; fields: ReviewField[];
}
export interface DocumentExport {
  review_id: string; revision: number; filename: string; download_url: string; expires_in: number;
}
interface Envelope<T> { success: boolean; data: T; message?: string }
const config = { skipLoading: true, skipGlobalError: true };
const path = (id: string) => `/document-requests/${encodeURIComponent(id)}`;
function unwrap<T>(response: Envelope<T>) {
  if (!response.success) throw new Error(response.message || 'Không thể xử lý yêu cầu.');
  return response.data;
}
export const documentReviewApi = {
  get: async (id: string, signal?: AbortSignal): Promise<DocumentReview | null> => {
    try {
      return unwrap(await axiosClient.get<Envelope<DocumentReview | null>, Envelope<DocumentReview | null>>(`${path(id)}/review`, { ...config, signal }));
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) return null;
      throw error;
    }
  },
  save: async (id: string, body: ReviewPayload, key: string, signal?: AbortSignal) => {
    // Read the saved review with GET: the PUT response contract is not specified.
    unwrap(await axiosClient.put<Envelope<unknown>, Envelope<unknown>>(`${path(id)}/review`, body, {
      ...config, signal, headers: { 'Idempotency-Key': key },
    }));
  },
  export: async (id: string, revision: number, signal?: AbortSignal) => unwrap(await axiosClient.post<Envelope<DocumentExport>, Envelope<DocumentExport>>(
    `${path(id)}/exports`, { revision }, { ...config, signal },
  )),
  download: async (id: string, revision: number, signal?: AbortSignal) => unwrap(await axiosClient.get<Envelope<DocumentExport>, Envelope<DocumentExport>>(
    `${path(id)}/exports/${revision}/download-url`, { ...config, signal },
  )),
};
