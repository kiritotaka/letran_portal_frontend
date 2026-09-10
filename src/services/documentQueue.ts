import type { InputDocumentGroup, QueuedRequestFile, RequestDraft } from './documentWorkflowTypes';

export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_REQUEST_FILES = 30;
export const FILE_ACCEPT = '.jpg,.jpeg,.png,.pdf,.docx';
const allowedMime: Record<string, string[]> = {
  jpg: ['image/jpeg'], jpeg: ['image/jpeg'], png: ['image/png'], pdf: ['application/pdf'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
};

export function validateFile(file: File): string | undefined {
  const extension = file.name.split('.').at(-1)?.toLowerCase() ?? '';
  if (!allowedMime[extension] || (file.type && !allowedMime[extension].includes(file.type))) {
    return `${file.name}: chỉ chấp nhận JPG, PNG, PDF hoặc DOCX.`;
  }
  if (file.size > MAX_FILE_BYTES) return `${file.name}: vượt quá 10 MiB.`;
  if (file.size === 0) return `${file.name}: file rỗng.`;
}

export function newGroup(): InputDocumentGroup {
  return { localId: crypto.randomUUID(), title: '', documentTypeId: '', files: [] };
}

export function queueFiles(files: File[], existingCount: number): { files: QueuedRequestFile[]; errors: string[] } {
  const accepted: QueuedRequestFile[] = [];
  const errors: string[] = [];
  for (const file of files) {
    const error = validateFile(file);
    if (error) { errors.push(error); continue; }
    if (existingCount + accepted.length >= MAX_REQUEST_FILES) {
      errors.push(`${file.name}: mỗi hồ sơ chỉ được có tối đa 30 file.`);
      continue;
    }
    accepted.push({ localId: crypto.randomUUID(), file, idempotencyKey: crypto.randomUUID(), stage: 'queued', progress: 0 });
  }
  return { files: accepted, errors };
}

export function validateDraft(draft: RequestDraft): string | undefined {
  if (!draft.title.trim()) return 'Vui lòng nhập tên hồ sơ.';
  if (!draft.taskId) return 'Vui lòng chọn tác vụ.';
  if (draft.groups.length === 0) return 'Vui lòng thêm ít nhất một tài liệu đầu vào.';
  if (draft.groups.reduce((n, g) => n + g.files.length, 0) > MAX_REQUEST_FILES) return 'Mỗi hồ sơ chỉ được có tối đa 30 file.';
  for (const [i, group] of draft.groups.entries()) {
    if (!group.title.trim()) return `Vui lòng nhập tên tài liệu ${i + 1}.`;
    if (!group.documentTypeId) return `Vui lòng chọn loại tài liệu ${i + 1}.`;
    if (group.files.length === 0) return `Vui lòng chọn file cho tài liệu ${i + 1}.`;
    for (const entry of group.files) {
      const error = validateFile(entry.file);
      if (error) return error;
    }
  }
}
