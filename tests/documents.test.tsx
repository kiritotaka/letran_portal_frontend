import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { axiosClient } from '../src/services/axiosClient';
import DocumentsPage from '../src/pages/DocumentsPage';

const auth = vi.hoisted(() => ({ allowed: true }));
vi.mock('../src/context/AuthContext', () => ({ useAuth: () => ({
  user: { id: 'user-1' }, token: 'token', hasPermission: () => auth.allowed,
}) }));
const clients: QueryClient[] = [];
afterEach(() => { cleanup(); clients.forEach((c) => c.clear()); clients.length = 0; auth.allowed = true; vi.restoreAllMocks(); });

function mount(mode: 'normal' | 'empty' | 'error' | 'types-error' = 'normal') {
  const calls: string[] = [];
  const typeCalls: string[] = [];
  const adapter = vi.spyOn(axiosClient.defaults, 'adapter', 'get').mockReturnValue(async (config) => {
    if (config.url === '/document-types') {
      typeCalls.push(axiosClient.getUri(config));
      return { status: 200, statusText: 'OK', headers: {}, config, data: {
        success: mode !== 'types-error', data: {
          items: mode === 'empty' ? [] : [
            { id: 'type-1', code: 'HD', name: 'Hợp đồng', is_active: true },
            { id: 'type-2', code: 'OLD', name: 'Mẫu cũ', is_active: false },
          ],
          pagination: { page: 1, page_size: 100, total: 2, total_pages: 1, has_next: false, has_previous: false },
        },
      } };
    }
    calls.push(axiosClient.getUri(config));
    const page = Number(config.params.page);
    const size = Number(config.params.page_size);
    const total = mode === 'empty' ? 0 : config.params.search ? 17 : 32;
    return { status: 200, statusText: 'OK', headers: {}, config, data: {
      success: mode !== 'error', data: {
        items: mode === 'empty' ? [] : [{ id: `request-${page}`, task_id: 'task-1', template_id: 'template-1', title: `Hồ sơ ${page}`,
          status: 'pending', created_by: 'creator-1', updated_by: 'editor-1', created_at: '2026-09-09T06:18:29.257Z', updated_at: '2026-09-09T06:18:29.257Z' }],
        pagination: { page, page_size: size, total, total_pages: Math.ceil(total / size), has_next: page * size < total, has_previous: page > 1 },
      },
    } };
  });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  clients.push(client);
  render(<QueryClientProvider client={client}><MemoryRouter><DocumentsPage /></MemoryRouter></QueryClientProvider>);
  return { calls, typeCalls, adapter };
}

it('loads document-requests, renders the new fields and paginates with page_size', async () => {
  const { calls } = mount();
  await screen.findByText('Hồ sơ 1');
  expect(calls[0]).toMatch(/\/api\/v1\/document-requests\?page=1&page_size=10$/);
  for (const value of ['pending', 'task-1', 'template-1', 'creator-1', 'editor-1']) expect(screen.getByText(value)).toBeTruthy();
  fireEvent.click(screen.getByTitle('Trang kế tiếp'));
  await screen.findByText('Hồ sơ 2');
  expect(calls[1]).toMatch(/page=2&page_size=10$/);
  fireEvent.change(document.getElementById('pagination-limit-select')!, { target: { value: '20' } });
  await screen.findByText('Hồ sơ 1');
  expect(calls[2]).toMatch(/page=1&page_size=20$/);
  fireEvent.click(screen.getByRole('button', { name: 'Làm mới danh sách tài liệu' }));
  await waitFor(() => expect(calls).toHaveLength(4));
  expect(calls.every((url) => url.includes('/document-requests?'))).toBe(true);
});

it('shows an empty list without file actions', async () => {
  mount('empty');
  await screen.findByText('Chưa có tài liệu.');
  expect(screen.queryByTitle('Trang kế tiếp')).toBeNull();
  expect(screen.queryByRole('button', { name: /Xuất|Upload|Xóa/ })).toBeNull();
});

it('shows a retry action on failure', async () => {
  const { calls } = mount('error');
  await screen.findByRole('alert');
  fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
  await waitFor(() => expect(calls).toHaveLength(2));
});

it('does not fetch when the user lacks DOC_VIEW', async () => {
  auth.allowed = false;
  const { calls, typeCalls } = mount();
  await act(async () => {});
  expect(calls).toHaveLength(0);
  expect(typeCalls).toHaveLength(0);
});

it('loads document types from the paginated envelope and selects by ID', async () => {
  const { typeCalls } = mount();
  await screen.findByRole('option', { name: 'Hợp đồng (HD)' });
  expect(typeCalls).toHaveLength(1);
  expect(typeCalls[0]).toMatch(/\/api\/v1\/document-types\?page=1&page_size=100$/);
  expect(screen.getByRole('option', { name: 'Mẫu cũ (OLD) — Ngừng hoạt động' })).toBeTruthy();
  const select = screen.getByLabelText('Loại tài liệu') as HTMLSelectElement;
  fireEvent.change(select, { target: { value: 'type-1' } });
  expect(select.value).toBe('type-1');
});

it('keeps the document list usable when loading document types fails', async () => {
  const { typeCalls } = mount('types-error');
  await screen.findByText('Hồ sơ 1');
  await screen.findByRole('alert');
  expect((screen.getByLabelText('Loại tài liệu') as HTMLSelectElement).disabled).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'Tải lại loại tài liệu' }));
  await waitFor(() => expect(typeCalls).toHaveLength(2));
});

it('combines server filters, resets the page atomically and uses the filtered server total', async () => {
  const { calls } = mount();
  await screen.findByText('Hồ sơ 1');
  fireEvent.click(screen.getByTitle('Trang kế tiếp'));
  await screen.findByText('Hồ sơ 2');
  fireEvent.change(screen.getByLabelText('Loại tài liệu'), { target: { value: 'type-1' } });
  await screen.findByText('Hồ sơ 1');
  expect(new URL(calls.at(-1)!).searchParams.get('page')).toBe('1');
  expect(new URL(calls.at(-1)!).searchParams.get('document_type_id')).toBe('type-1');
  fireEvent.click(screen.getByTitle('Trang kế tiếp'));
  await screen.findByText('Hồ sơ 2');
  const beforeSearch = calls.length;
  fireEvent.change(screen.getByLabelText('Tìm hồ sơ'), { target: { value: '  Nhóm hợp đồng & hồ sơ  ' } });
  expect(calls).toHaveLength(beforeSearch);
  await waitFor(() => expect(calls).toHaveLength(beforeSearch + 1));
  const query = new URL(calls.at(-1)!).searchParams;
  expect(Object.fromEntries(query)).toEqual({ page: '1', page_size: '10', document_type_id: 'type-1', search: 'Nhóm hợp đồng & hồ sơ' });
  await screen.findByText('Hồ sơ 1');
  expect(screen.getByText('17', { selector: 'strong' })).toBeTruthy();
  fireEvent.click(screen.getByTitle('Trang kế tiếp'));
  await screen.findByText('Hồ sơ 2');
  expect(new URL(calls.at(-1)!).searchParams.get('search')).toBe('Nhóm hợp đồng & hồ sơ');
  fireEvent.change(screen.getByLabelText('Tìm hồ sơ'), { target: { value: '' } });
  await waitFor(() => expect(new URL(calls.at(-1)!).searchParams.has('search')).toBe(false));
  fireEvent.change(screen.getByLabelText('Loại tài liệu'), { target: { value: '' } });
  await waitFor(() => expect(new URL(calls.at(-1)!).searchParams.has('document_type_id')).toBe(false));
  expect(new URL(calls.at(-1)!).searchParams.get('page')).toBe('1');
});
