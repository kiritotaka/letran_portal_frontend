import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import DocumentRequestDetailPage from '../src/pages/DocumentRequestDetailPage';
import { axiosClient } from '../src/services/axiosClient';

vi.mock('../src/context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'owner' }, token: 'token', hasAnyPermission: () => true, hasPermission: () => false }) }));
const clients: QueryClient[] = [];
afterEach(() => { cleanup(); clients.forEach((c) => c.clear()); clients.length = 0; vi.restoreAllMocks(); });
const page = (items: unknown[], current = 1, next = false) => ({ success: true, data: { items, pagination: {
  page: current, page_size: 100, total: 3, total_pages: next ? 2 : current, has_next: next, has_previous: current > 1,
} } });
const link = (id: string, document: string, order: number) => ({ request_id: 'r1', document_id: document, file_id: id, sort_order: order,
  file: { id, original_name: `${id}.jpg`, content_type: 'image/jpeg', size_bytes: 1024, status: 'uploaded', created_by: 'owner', created_at: '', updated_at: '' } });

it('opens directly using three APIs, follows pagination and groups/sorts nested files', async () => {
  const calls: string[] = [];
  let failFiles = true;
  vi.spyOn(axiosClient.defaults, 'adapter', 'get').mockReturnValue(async (config) => {
    calls.push(axiosClient.getUri(config));
    let data: unknown;
    if (config.url === '/document-requests/r1/jobs') data = page([]);
    else if (config.url === '/document-requests/r1') data = { success: true, data: { id: 'r1', title: 'Hồ sơ mở trực tiếp', task_id: 't1', template_id: 'template', status: 'draft', created_at: '2026-09-09T06:39:36Z' } };
    else if (config.url === '/document-requests/r1/documents') data = config.params.page === 1
      ? page([{ id: 'd1', title: 'Hợp đồng', document_type_id: 'type-1' }], 1, true)
      : page([{ id: 'd2', title: 'Hóa đơn', document_type_id: 'type-2' }], 2);
    else if (config.url === '/document-requests/r1/files') {
      data = failFiles ? { success: false, message: 'Try later' }
        : config.params.page === 1 ? page([link('second', 'd1', 2), link('invoice', 'd2', 1)], 1, true)
        : page([link('first', 'd1', 1)], 2);
    } else throw new Error(`Unexpected API ${config.url}`);
    return { config, data, status: 200, statusText: 'OK', headers: {} };
  });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } }); clients.push(client);
  render(<QueryClientProvider client={client}><MemoryRouter initialEntries={['/documents/r1']}><Routes><Route path="/documents/:requestId" element={<DocumentRequestDetailPage />} /></Routes></MemoryRouter></QueryClientProvider>);
  await screen.findByRole('heading', { name: 'Hồ sơ mở trực tiếp' });
  await screen.findByRole('heading', { name: 'Hóa đơn' });
  await screen.findByRole('alert');
  failFiles = false;
  fireEvent.click(screen.getByRole('button', { name: 'Thử lại danh sách file' }));
  await screen.findByText('1. first.jpg');
  const contract = within(screen.getByRole('region', { name: 'Hợp đồng' }));
  expect(contract.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
    expect.stringContaining('1. first.jpg'), expect.stringContaining('2. second.jpg'),
  ]);
  expect(within(screen.getByRole('region', { name: 'Hóa đơn' })).getByText('1. invoice.jpg')).toBeTruthy();
  expect(calls.some((url) => url.endsWith('/documents?page=2&page_size=100'))).toBe(true);
  expect(calls.some((url) => url.endsWith('/files?page=2&page_size=100'))).toBe(true);
  await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
});
