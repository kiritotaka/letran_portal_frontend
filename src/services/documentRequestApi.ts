import type { AxiosProgressEvent } from 'axios';
import axiosClient from './axiosClient';
import type { ApiPagination, DocumentRequest, DocumentTypeListItem } from '../types';
import type { DocumentTask, DocumentWorkflowApi, OutputTemplate, RequestDocument, SavedRequestFile, RequestFileLink } from './documentWorkflowTypes';
import { UncertainWriteError } from './documentWorkflow';

interface Envelope<T> { success: boolean; data: T; message?: string }
interface Collection<T> { items: T[]; pagination: ApiPagination }
export interface TemplateUrl {
  template_id: string;
  name: string;
  version: number;
  output_format: string;
  url: string;
  expires_in: number;
}
const config = { skipLoading: true, skipGlobalError: true };
const pathFor = (id: string) => `/document-requests/${encodeURIComponent(id)}/documents`;
const unwrap = <T,>(response: Envelope<T>) => {
  if (!response.success) throw new Error(response.message || 'Máy chủ chưa xử lý thành công yêu cầu.');
  return response.data;
};
const created = <T extends { id: string },>(response: Envelope<T>): T => {
  const data = unwrap(response);
  if (!data?.id) throw new UncertainWriteError('Máy chủ chưa trả về ID. Cần kiểm tra lại kết quả trước khi tiếp tục.');
  return data;
};

async function listAll<T>(url: string, params: Record<string, string> = {}, signal?: AbortSignal): Promise<T[]> {
  const result: T[] = [];
  let page = 1;
  const seen = new Set<number>();
  while (true) {
    const response = await axiosClient.get<Envelope<Collection<T>>, Envelope<Collection<T>>>(url, {
      ...config, params: { ...params, page, page_size: 100 }, signal,
    });
    const data = unwrap(response);
    if (!Array.isArray(data.items) || !data.pagination || seen.has(data.pagination.page)) {
      throw new Error('Không thể đọc đầy đủ danh sách từ máy chủ.');
    }
    seen.add(data.pagination.page);
    result.push(...data.items);
    if (!data.pagination.has_next) return result;
    if (!data.items.length) throw new Error('Máy chủ trả về danh sách phân trang chưa đầy đủ.');
    page = data.pagination.page + 1;
  }
}

export const documentRequestApi: DocumentWorkflowApi & {
  tasks: (signal?: AbortSignal) => Promise<DocumentTask[]>;
  types: (signal?: AbortSignal) => Promise<DocumentTypeListItem[]>;
  templates: (taskId: string, signal?: AbortSignal) => Promise<OutputTemplate[]>;
  getRequest: (requestId: string, signal?: AbortSignal) => Promise<DocumentRequest>;
  files: (requestId: string, signal?: AbortSignal) => Promise<RequestFileLink[]>;
  templateUrl: (requestId: string, signal?: AbortSignal) => Promise<TemplateUrl>;
} = {
  templateUrl: async (requestId, signal) => unwrap(await axiosClient.get<Envelope<TemplateUrl>, Envelope<TemplateUrl>>(
    `/document-requests/${encodeURIComponent(requestId)}/template-url`, { ...config, signal },
  )),
  tasks: (signal) => listAll<DocumentTask>('/document-tasks', {}, signal),
  types: (signal) => listAll<DocumentTypeListItem>('/document-types', {}, signal),
  templates: (taskId, signal) => listAll<OutputTemplate>(`/document-tasks/${encodeURIComponent(taskId)}/templates`, {}, signal),
  getRequest: async (requestId, signal) => unwrap(await axiosClient.get<Envelope<DocumentRequest>, Envelope<DocumentRequest>>(
    `/document-requests/${encodeURIComponent(requestId)}`, { ...config, signal },
  )),
  files: (requestId, signal) => listAll<RequestFileLink>(`/document-requests/${encodeURIComponent(requestId)}/files`, {}, signal),
  listRequests: (title) => listAll<DocumentRequest>('/document-requests', { search: title }),
  listDocuments: (requestId, signal) => listAll<RequestDocument>(pathFor(requestId), {}, signal),
  createRequest: async (body) => created(await axiosClient.post<Envelope<DocumentRequest>, Envelope<DocumentRequest>>('/document-requests', body, config)),
  createDocument: async (requestId, body) => created(await axiosClient.post<Envelope<RequestDocument>, Envelope<RequestDocument>>(pathFor(requestId), body, config)),
  uploadFile: async (requestId, documentId, file, order, key, onProgress) => {
    const body = new FormData();
    body.append('file', file);
    body.append('sort_order', String(order));
    return created(await axiosClient.post<Envelope<SavedRequestFile>, Envelope<SavedRequestFile>>(
      `${pathFor(requestId)}/${encodeURIComponent(documentId)}/files`, body, {
        ...config,
        timeout: 120000,
        // Let the browser set the multipart boundary instead of the JSON client default.
        headers: { 'Content-Type': undefined, 'Idempotency-Key': key },
        onUploadProgress: (event: AxiosProgressEvent) => onProgress(event.loaded, event.total),
      },
    ));
  },
};
