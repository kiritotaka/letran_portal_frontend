import { describe, expect, it, vi } from 'vitest';
import { AxiosError } from 'axios';
import { DocumentWorkflow } from '../src/services/documentWorkflow';
import { MAX_FILE_BYTES, newGroup, queueFiles, validateDraft, validateFile } from '../src/services/documentQueue';
import type { DocumentWorkflowApi, RequestDraft, SavedRequestFile, WorkflowSnapshot } from '../src/services/documentWorkflowTypes';
import type { DocumentRequest } from '../src/types';

const request: DocumentRequest = { id: 'request-1', task_id: 'task-1', template_id: 'template-1', title: 'Hồ sơ', status: 'draft', created_by: 'owner', updated_by: 'owner', created_at: '', updated_at: '' };
const doc = { id: 'doc-1', title: 'Hợp đồng', document_type_id: 'type-1', request_id: 'request-1' };
const saved: SavedRequestFile = { id: 'file-1', original_name: 'page.jpg', content_type: 'image/jpeg', size_bytes: 1, status: 'uploading', created_by: 'owner', created_at: '', updated_at: '' };
const image = (name = 'page.jpg') => new File(['x'], name, { type: 'image/jpeg' });
function draft(count = 2): RequestDraft {
  return { title: 'Hồ sơ', taskId: 'task-1', groups: [{ ...newGroup(), title: 'Hợp đồng', documentTypeId: 'type-1',
    files: queueFiles(Array.from({ length: count }, (_, i) => image(`page-${i}.jpg`)), 0).files }] };
}
function apiMock() {
  return {
    listRequests: vi.fn<DocumentWorkflowApi['listRequests']>().mockResolvedValue([]),
    createRequest: vi.fn<DocumentWorkflowApi['createRequest']>().mockResolvedValue(request),
    listDocuments: vi.fn<DocumentWorkflowApi['listDocuments']>().mockResolvedValue([]),
    createDocument: vi.fn<DocumentWorkflowApi['createDocument']>().mockResolvedValue(doc),
    uploadFile: vi.fn<DocumentWorkflowApi['uploadFile']>().mockResolvedValue(saved),
  };
}

describe('file queue', () => {
  it('enforces extension, MIME, size and request-wide count before any network call', () => {
    expect(validateFile(image())).toBeUndefined();
    expect(validateFile(new File(['x'], 'invoice.pdf', { type: 'application/pdf' }))).toBeUndefined();
    expect(validateFile(new File(['x'], 'letter.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }))).toBeUndefined();
    expect(validateFile(new File(['x'], 'image.png', { type: 'image/png' }))).toBeUndefined();
    expect(validateFile(new File(['x'], 'image.jpg', { type: 'text/html' }))).toBeTruthy();
    expect(validateFile(new File(['x'], 'script.exe'))).toBeTruthy();
    expect(validateFile(new File([new Uint8Array(MAX_FILE_BYTES)], 'max.pdf'))).toBeUndefined();
    expect(validateFile(new File([new Uint8Array(MAX_FILE_BYTES + 1)], 'large.pdf'))).toContain('10 MiB');
    const result = queueFiles([image('one.jpg'), image('two.jpg')], 29);
    expect(result.files).toHaveLength(1);
    expect(result.errors[0]).toContain('30 file');
    const keys = queueFiles([image(), image()], 0).files.map((f) => f.idempotencyKey);
    expect(new Set(keys).size).toBe(2);
  });
  it('requires task, named groups, document types and files', () => {
    expect(validateDraft(draft())).toBeUndefined();
    expect(validateDraft({ ...draft(), taskId: '' })).toBeTruthy();
    expect(validateDraft({ ...draft(), groups: [] })).toBeTruthy();
    expect(validateDraft(draft(0))).toBeTruthy();
  });
});

it('creates in sequence and retries only failed files using the same IDs, key and order', async () => {
  const api = apiMock();
  api.uploadFile.mockResolvedValueOnce(saved).mockRejectedValueOnce(new AxiosError('timeout', 'ECONNABORTED')).mockResolvedValue(saved);
  const input = draft();
  const engine = new DocumentWorkflow(input, api, () => {});
  await engine.save();
  expect(engine.complete).toBe(false);
  expect(engine.state.groups[0].files.map((f) => f.stage)).toEqual(['complete', 'error']);
  await engine.save(input.groups[0].files[1].localId);
  expect(engine.complete).toBe(true);
  expect(api.createRequest).toHaveBeenCalledTimes(1);
  expect(api.createDocument).toHaveBeenCalledTimes(1);
  expect(api.uploadFile).toHaveBeenCalledTimes(3);
  const firstAttempt = api.uploadFile.mock.calls[1];
  const retry = api.uploadFile.mock.calls[2];
  expect(retry.slice(0, 5)).toEqual(firstAttempt.slice(0, 5));
  expect(retry.slice(0, 2)).toEqual(['request-1', 'doc-1']);
  expect(retry[3]).toBe(2);
  expect(api.listRequests.mock.invocationCallOrder[0]).toBeLessThan(api.createRequest.mock.invocationCallOrder[0]);
});

it('shows saving after the bytes finish, completes only on success and blocks concurrent saves', async () => {
  const api = apiMock();
  let resolveUpload!: (value: SavedRequestFile) => void;
  const states: WorkflowSnapshot[] = [];
  api.uploadFile.mockImplementation(async (_r, _d, _f, _order, _key, progress) => {
    progress(5, 10); progress(10, 10);
    return new Promise((resolve) => { resolveUpload = resolve; });
  });
  const engine = new DocumentWorkflow(draft(1), api, (state) => states.push(state));
  const pending = engine.save();
  await vi.waitFor(() => expect(resolveUpload).toBeTypeOf('function'));
  expect(states.some((s) => s.groups[0].files[0].stage === 'uploading' && s.groups[0].files[0].progress === 50)).toBe(true);
  expect(engine.state.groups[0].files[0].stage).toBe('saving');
  expect(engine.complete).toBe(false);
  await engine.save();
  expect(api.createRequest).toHaveBeenCalledTimes(1);
  resolveUpload(saved); await pending;
  expect(engine.complete).toBe(true);
});

it('recovers request and group creation timeouts by finding new matching IDs', async () => {
  const api = apiMock();
  api.createRequest.mockRejectedValue(new AxiosError('timeout', 'ECONNABORTED'));
  api.listRequests.mockResolvedValueOnce([{ ...request, id: 'old-request' }]).mockResolvedValue([{ ...request, id: 'old-request' }, request]);
  api.createDocument.mockRejectedValue(new AxiosError('timeout', 'ECONNABORTED'));
  api.listDocuments.mockResolvedValueOnce([{ ...doc, id: 'old-doc' }]).mockResolvedValue([{ ...doc, id: 'old-doc' }, doc]);
  const engine = new DocumentWorkflow(draft(1), api, () => {}, () => {}, 'owner');
  await engine.save();
  expect(engine.complete).toBe(true);
  expect(api.createRequest).toHaveBeenCalledTimes(1);
  expect(api.createDocument).toHaveBeenCalledTimes(1);
  expect(engine.state.request?.id).toBe('request-1');
  expect(engine.state.groups[0].document?.id).toBe('doc-1');
});

it('never repeats an uncertain POST when reconciliation finds zero or multiple matches', async () => {
  const api = apiMock();
  api.createRequest.mockRejectedValue(new AxiosError('timeout', 'ECONNABORTED'));
  const engine = new DocumentWorkflow(draft(), api, () => {});
  await engine.save(); await engine.save();
  expect(api.createRequest).toHaveBeenCalledTimes(1);
  expect(api.createDocument).not.toHaveBeenCalled();
  expect(engine.state.requestUncertain).toBe(true);
  api.listRequests.mockResolvedValue([request, { ...request, id: 'another-new-request' }]);
  await engine.save();
  expect(api.createRequest).toHaveBeenCalledTimes(1);
  expect(engine.state.error).toContain('nhiều hồ sơ');
});

it('does not POST if the preflight list fails and stops when authorization changes', async () => {
  const api = apiMock();
  api.listRequests.mockRejectedValueOnce(new Error('offline'));
  const check = vi.fn();
  const engine = new DocumentWorkflow(draft(), api, () => {}, check);
  await engine.save();
  expect(api.createRequest).not.toHaveBeenCalled();
  check.mockImplementation(() => { throw new Error('Session changed'); });
  await engine.save();
  expect(api.createRequest).not.toHaveBeenCalled();
});
