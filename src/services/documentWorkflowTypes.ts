import type { DocumentRequest, DocumentTypeListItem } from '../types';

export interface DocumentTask {
  id: string;
  name: string;
  code?: string;
  is_active: boolean;
}

export interface OutputTemplate {
  id: string;
  task_id: string;
  name: string;
  version: number | string;
  output_format: string;
  is_active: boolean;
}

export interface RequestDocument {
  id: string;
  title: string;
  document_type_id: string;
  request_id?: string;
  created_by?: string;
  created_at?: string;
}

export interface SavedRequestFile {
  id: string;
  original_name: string;
  content_type: string;
  size_bytes: number;
  status: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  sort_order?: number;
}

export interface RequestFileLink {
  request_id: string;
  document_id: string;
  file_id: string;
  sort_order: number;
  file: SavedRequestFile;
}

export type FileStage = 'queued' | 'uploading' | 'saving' | 'complete' | 'error';
export interface QueuedRequestFile {
  localId: string;
  file: File;
  idempotencyKey: string;
  stage: FileStage;
  progress: number;
  error?: string;
  saved?: SavedRequestFile;
}
export interface InputDocumentGroup {
  localId: string;
  title: string;
  documentTypeId: string;
  files: QueuedRequestFile[];
  document?: RequestDocument;
  error?: string;
  uncertain?: boolean;
  baselineIds?: string[];
}
export interface RequestDraft {
  title: string;
  taskId: string;
  groups: InputDocumentGroup[];
}
export interface WorkflowSnapshot extends RequestDraft {
  request?: DocumentRequest;
  requestUncertain?: boolean;
  requestBaselineIds?: string[];
  busy: boolean;
  message: string;
  error?: string;
}

export interface DocumentWorkflowApi {
  listRequests: (title: string) => Promise<DocumentRequest[]>;
  createRequest: (body: { title: string; task_id: string }) => Promise<DocumentRequest>;
  listDocuments: (requestId: string, signal?: AbortSignal) => Promise<RequestDocument[]>;
  createDocument: (requestId: string, body: { title: string; document_type_id: string }) => Promise<RequestDocument>;
  uploadFile: (requestId: string, documentId: string, file: File, order: number, key: string,
    onProgress: (loaded: number, total?: number) => void) => Promise<SavedRequestFile>;
}

export interface CreatedRequestSummary {
  request: DocumentRequest;
  groups: Array<{ document: RequestDocument; files: Array<{ name: string; status: FileStage; saved?: SavedRequestFile }> }>;
  taskName?: string;
  templates?: OutputTemplate[];
  documentTypes?: DocumentTypeListItem[];
}
