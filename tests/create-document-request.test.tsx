import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AxiosError } from 'axios';
import CreateDocumentRequestPage from '../src/pages/CreateDocumentRequestPage';
import DocumentRequestDetailPage from '../src/pages/DocumentRequestDetailPage';
import { axiosClient } from '../src/services/axiosClient';
import { useAuthStore } from '../src/stores/authStore';

vi.mock('../src/context/AuthContext', () => ({ useAuth: () => useAuthStore() }));
const clients: QueryClient[] = [];
beforeEach(() => {
  useAuthStore.getState().saveSession({ access_token: 'token', refresh_token: 'refresh', expires_in: 3600, expires_at: null,
    user: { id: 'owner', email: 'owner@example.com', is_super_admin: false, is_first_login: false, permissions: ['DOC_CREATE', 'DOC_VIEW'] } });
  useAuthStore.getState().setLoading(false);
});
afterEach(() => { cleanup(); clients.forEach((c) => c.clear()); clients.length = 0; vi.restoreAllMocks(); useAuthStore.getState().clearSession(); });

const collection = (items: unknown[]) => ({ success: true, data: { items, pagination: { page: 1, page_size: 100, total: items.length, total_pages: 1, has_next: false, has_previous: false } } });
const request = { id: 'request-1', task_id: 'task-1', template_id: 'template-1', title: 'Nghiệm thu ETEC', status: 'draft', created_by: 'owner', updated_by: 'owner', created_at: '2026-09-09T06:33:05Z', updated_at: '2026-09-09T06:33:05Z' };

function mount(failFirstUpload = false) {
  const calls: Array<{ url: string; method: string; body: any; key: unknown }> = [];
  let failed = false;
  let docCount = 0;
  const groups: unknown[] = [];
  vi.spyOn(axiosClient.defaults, 'adapter', 'get').mockReturnValue(async (config) => {
    expect(config.headers.Authorization).toBe('Bearer token');
    const url = config.url!;
    const body = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
    calls.push({ url, method: config.method!, body, key: config.headers.get('Idempotency-Key') });
    let data: unknown;
    if (config.method === 'get') {
      if (url === '/document-tasks') data = collection([{ id: 'task-1', code: 'TASK', name: 'Lập biên bản nghiệm thu', is_active: true }]);
      else if (url === '/document-types') data = collection([{ id: 'type-1', code: 'HD', name: 'Hợp đồng kinh tế', is_active: true }, { id: 'type-2', code: 'INV', name: 'Hóa đơn', is_active: true }]);
      else if (url === '/document-tasks/task-1/templates') data = collection([{ id: 'template-1', task_id: 'task-1', name: 'Biên bản nghiệm thu', version: 1, output_format: 'docx', is_active: false }]);
      else if (url === '/document-requests') data = collection([]);
      else if (url === '/document-requests/request-1/documents') data = collection(groups);
      else if (url === '/document-requests/request-1') data = { success: true, data: request };
      else if (url === '/document-requests/request-1/files') data = collection([]);
      else if (url === '/document-requests/request-1/jobs') data = collection([]);
      else throw new Error(`Unexpected GET ${url}`);
    } else if (url === '/document-requests') data = { success: true, data: request };
    else if (url === '/document-requests/request-1/documents') {
      const doc = { id: `doc-${++docCount}`, request_id: 'request-1', ...body };
      groups.push(doc); data = { success: true, data: doc };
    } else if (url.endsWith('/files')) {
      expect(body).toBeInstanceOf(FormData);
      expect(config.headers.get('Content-Type')).not.toBe('application/json');
      config.onUploadProgress?.({ loaded: 10, total: 10, bytes: 10, lengthComputable: true });
      if (failFirstUpload && !failed) { failed = true; throw new AxiosError('Upload interrupted', 'ERR_NETWORK', config); }
      const file = body.get('file') as File;
      data = { success: true, data: { id: crypto.randomUUID(), original_name: file.name, content_type: file.type, size_bytes: file.size, status: 'uploading', created_by: 'owner', created_at: '', updated_at: '' } };
    } else throw new Error(`Unexpected request ${url}`);
    return { config, status: 200, statusText: 'OK', headers: {}, data };
  });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  clients.push(client);
  render(<QueryClientProvider client={client}><MemoryRouter initialEntries={['/documents/new']}><Routes>
    <Route path="/documents/new" element={<CreateDocumentRequestPage />} />
    <Route path="/documents/:requestId" element={<DocumentRequestDetailPage />} />
    <Route path="/documents" element={<p>Danh sách</p>} />
  </Routes></MemoryRouter></QueryClientProvider>);
  return calls;
}

async function fill() {
  await screen.findByText('Phiên bản 1 · Chưa sẵn sàng xuất');
  expect((screen.getByLabelText(/Tác vụ/) as HTMLSelectElement).value).toBe('task-1');
  fireEvent.change(screen.getByLabelText(/Tên hồ sơ/), { target: { value: 'Nghiệm thu ETEC' } });
  fireEvent.change(screen.getByLabelText(/Tên tài liệu/), { target: { value: 'Hợp đồng chính' } });
  fireEvent.change(screen.getByLabelText(/Loại tài liệu/), { target: { value: 'type-1' } });
}
const file = (name: string) => new File(['x'], name, { type: 'image/jpeg' });

it('queues and reorders files before saving, creates groups and uploads in the selected order with inactive templates', async () => {
  const calls = mount();
  await fill();
  fireEvent.change(screen.getByLabelText('Chọn file tài liệu 1'), { target: { files: [file('page-1.jpg'), file('page-2.jpg')] } });
  fireEvent.click(screen.getByRole('button', { name: 'Đưa page-2.jpg lên' }));
  fireEvent.click(screen.getByRole('button', { name: 'Thêm tài liệu khác' }));
  const second = within(screen.getByRole('region', { name: 'Tài liệu 2' }));
  fireEvent.change(second.getByLabelText(/Tên tài liệu/), { target: { value: 'Hóa đơn dịch vụ' } });
  fireEvent.change(second.getByLabelText(/Loại tài liệu/), { target: { value: 'type-2' } });
  fireEvent.change(second.getByLabelText('Chọn file tài liệu 2'), { target: { files: [file('invoice.jpg')] } });
  expect(calls.filter((c) => c.method === 'post')).toHaveLength(0);
  fireEvent.click(screen.getByRole('button', { name: 'Lưu hồ sơ' }));
  await screen.findByRole('heading', { name: 'Nghiệm thu ETEC' });
  const posts = calls.filter((c) => c.method === 'post');
  expect(posts[0].body).toEqual({ task_id: 'task-1', title: 'Nghiệm thu ETEC' });
  expect(posts.filter((c) => c.url.endsWith('/documents')).map((c) => c.body)).toEqual([
    { title: 'Hợp đồng chính', document_type_id: 'type-1' }, { title: 'Hóa đơn dịch vụ', document_type_id: 'type-2' },
  ]);
  const uploads = posts.filter((c) => c.url.endsWith('/files'));
  expect(uploads.map((c) => [c.body.get('file').name, c.body.get('sort_order')])).toEqual([['page-2.jpg', '1'], ['page-1.jpg', '2'], ['invoice.jpg', '1']]);
  expect(new Set(uploads.map((c) => c.key)).size).toBe(3);
  expect(uploads.every((c) => typeof c.key === 'string' && /^[0-9a-f-]{36}$/.test(c.key))).toBe(true);
});

it('keeps the failed upload on the form and retries it without recreating the request or group', async () => {
  const calls = mount(true);
  await fill();
  fireEvent.change(screen.getByLabelText('Chọn file tài liệu 1'), { target: { files: [file('page.jpg')] } });
  fireEvent.click(screen.getByRole('button', { name: 'Lưu hồ sơ' }));
  await screen.findByRole('button', { name: 'Mở hồ sơ đã lưu' });
  expect(screen.getByRole('heading', { name: 'Tạo hồ sơ tài liệu' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
  await screen.findByRole('heading', { name: 'Nghiệm thu ETEC' });
  const posts = calls.filter((c) => c.method === 'post');
  expect(posts.filter((c) => c.url === '/document-requests')).toHaveLength(1);
  expect(posts.filter((c) => c.url.endsWith('/documents'))).toHaveLength(1);
  const uploads = posts.filter((c) => c.url.endsWith('/files'));
  expect(uploads).toHaveLength(2);
  expect(uploads[1].key).toBe(uploads[0].key);
  expect(uploads[1].url).toBe(uploads[0].url);
});

it('rejects invalid files and permits removing queued files and groups without any POST', async () => {
  const calls = mount();
  await fill();
  fireEvent.change(screen.getByLabelText('Chọn file tài liệu 1'), { target: { files: [new File(['x'], 'bad.exe'), file('ok.jpg')] } });
  await screen.findByRole('alert');
  fireEvent.click(screen.getByRole('button', { name: 'Bỏ ok.jpg' }));
  fireEvent.click(screen.getByRole('button', { name: 'Bỏ nhóm' }));
  expect(screen.queryByRole('region', { name: 'Tài liệu 1' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Lưu hồ sơ' }));
  expect(calls.filter((c) => c.method === 'post')).toHaveLength(0);
});
