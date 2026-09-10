import axios from 'axios';
import { validateDraft } from './documentQueue';
import type { DocumentWorkflowApi, InputDocumentGroup, QueuedRequestFile, RequestDraft, WorkflowSnapshot } from './documentWorkflowTypes';

export class UncertainWriteError extends Error {}
export function uncertainWrite(error: unknown) {
  return error instanceof UncertainWriteError || (axios.isAxiosError(error) &&
    (!error.response || error.response.status >= 500 || error.response.status === 408));
}
export function workflowError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const body = error.response?.data;
    const message = body?.message || body?.error?.message;
    if (typeof message === 'string') return message;
  }
  return error instanceof Error ? error.message : 'Đã xảy ra lỗi. Vui lòng thử lại.';
}

// Lives for the lifetime of the form. IDs and keys survive each retry, while File objects stay in memory.
export class DocumentWorkflow {
  state: WorkflowSnapshot;
  constructor(draft: RequestDraft, private api: DocumentWorkflowApi,
    private emit: (state: WorkflowSnapshot) => void,
    private assertAuthorized: () => void = () => {}, private ownerId?: string) {
    this.state = { ...draft, title: draft.title.trim(), groups: draft.groups.map((g) => ({
      ...g, title: g.title.trim(), files: g.files.map((f) => ({ ...f })),
    })), busy: false, message: '' };
  }

  private publish() {
    this.emit({ ...this.state, groups: this.state.groups.map((g) => ({ ...g, files: g.files.map((f) => ({ ...f })) })) });
  }
  get complete() {
    return Boolean(this.state.request) && this.state.groups.every((g) => g.document && g.files.every((f) => f.stage === 'complete'));
  }

  private async ensureRequest() {
    if (this.state.request) return;
    this.assertAuthorized();
    if (this.state.requestUncertain) {
      this.state.message = 'Đang kiểm tra hồ sơ đã tạo'; this.publish();
      const rows = await this.api.listRequests(this.state.title);
      const matches = rows.filter((r) => !this.state.requestBaselineIds?.includes(r.id) &&
        r.title === this.state.title && r.task_id === this.state.taskId && (!this.ownerId || r.created_by === this.ownerId));
      if (matches.length !== 1) throw new Error(matches.length > 1
        ? 'Có nhiều hồ sơ trùng tên và tác vụ. Vui lòng kiểm tra danh sách; chưa tạo thêm hồ sơ.'
        : 'Chưa xác định được kết quả tạo hồ sơ. Bấm “Thử lại” để kiểm tra lại danh sách; hệ thống chưa tạo thêm hồ sơ.');
      this.state.request = matches[0]; this.state.requestUncertain = false; this.publish();
      return;
    }
    this.state.message = 'Đang kiểm tra danh sách trước khi tạo hồ sơ'; this.publish();
    this.state.requestBaselineIds = (await this.api.listRequests(this.state.title)).map((r) => r.id);
    this.assertAuthorized();
    this.state.message = 'Đang tạo hồ sơ'; this.publish();
    try {
      this.state.request = await this.api.createRequest({ title: this.state.title, task_id: this.state.taskId });
      this.publish();
    } catch (error) {
      if (uncertainWrite(error)) {
        this.state.requestUncertain = true;
        await this.ensureRequest();
      } else throw error;
    }
  }

  private async ensureDocument(group: InputDocumentGroup) {
    if (group.document) return;
    const requestId = this.state.request!.id;
    this.assertAuthorized();
    if (group.uncertain) {
      this.state.message = `Đang kiểm tra tài liệu: ${group.title}`; this.publish();
      const matches = (await this.api.listDocuments(requestId)).filter((d) =>
        !group.baselineIds?.includes(d.id) && d.title === group.title && d.document_type_id === group.documentTypeId);
      if (matches.length !== 1) throw new Error(matches.length > 1
        ? 'Có nhiều tài liệu trùng tên và loại. Chưa tạo thêm nhóm; vui lòng kiểm tra hồ sơ đã lưu.'
        : 'Chưa xác định được kết quả tạo nhóm. Thử lại để kiểm tra danh sách; chưa tạo thêm nhóm.');
      group.document = matches[0]; group.uncertain = false; this.publish();
      return;
    }
    group.baselineIds = (await this.api.listDocuments(requestId)).map((d) => d.id);
    this.assertAuthorized();
    this.state.message = `Đang tạo tài liệu: ${group.title}`; this.publish();
    try {
      group.document = await this.api.createDocument(requestId, { title: group.title, document_type_id: group.documentTypeId });
      this.publish();
    } catch (error) {
      if (uncertainWrite(error)) { group.uncertain = true; await this.ensureDocument(group); }
      else throw error;
    }
  }

  private async upload(group: InputDocumentGroup, entry: QueuedRequestFile, index: number) {
    if (entry.stage === 'complete') return;
    this.assertAuthorized();
    entry.stage = 'uploading'; entry.progress = 0; entry.error = undefined;
    this.state.message = `Đang tải ${entry.file.name}`; this.publish();
    try {
      entry.saved = await this.api.uploadFile(this.state.request!.id, group.document!.id,
        entry.file, index + 1, entry.idempotencyKey, (loaded, total) => {
          if (entry.stage !== 'uploading' && entry.stage !== 'saving') return;
          if (total && total > 0) {
            entry.progress = Math.min(100, Math.round(loaded / total * 100));
            if (loaded >= total) entry.stage = 'saving';
          }
          this.publish();
        });
      entry.stage = 'complete'; entry.progress = 100;
    } catch (error) {
      entry.stage = 'error'; entry.error = workflowError(error);
    }
    this.publish();
  }

  async save(onlyFileId?: string) {
    if (this.state.busy) return;
    const validation = validateDraft(this.state);
    if (validation) { this.state.error = validation; this.publish(); return; }
    this.state.busy = true; this.state.error = undefined; this.publish();
    try {
      await this.ensureRequest();
      for (const group of this.state.groups) {
        if (onlyFileId && !group.files.some((file) => file.localId === onlyFileId)) continue;
        group.error = undefined;
        try {
          await this.ensureDocument(group);
          for (const [index, file] of group.files.entries()) {
            if (!onlyFileId || file.localId === onlyFileId) await this.upload(group, file, index);
          }
        } catch (error) {
          group.error = workflowError(error); this.publish();
          // A later group could have the same title/type and be mistaken for this uncertain write.
          if (group.uncertain) break;
        }
      }
      this.state.message = this.complete ? 'Đã lưu toàn bộ hồ sơ' : 'Hồ sơ chưa hoàn tất. Bạn có thể thử lại phần bị lỗi.';
    } catch (error) { this.state.error = workflowError(error); }
    finally { this.state.busy = false; this.publish(); }
  }
}
