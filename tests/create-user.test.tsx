import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { axiosClient } from '../src/services/axiosClient';
import { permissionsApi } from '../src/services/api';
import { loadPermissionModules } from '../src/services/permissions';
import UsersPage from '../src/pages/UsersPage';
import CreateUserPage from '../src/pages/CreateUserPage';
import type { PermissionListItem, PermissionsResponse } from '../src/types';

vi.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({ user: { roleId: 'admin' }, hasPermission: () => true }),
}));

const clients: QueryClient[] = [];
afterEach(() => { cleanup(); clients.forEach((client) => client.clear()); clients.length = 0; vi.restoreAllMocks(); });

const permission = (id: number, code: string, name: string, groupId = 0): PermissionListItem => ({
  id, permission_code: code, permission_name: name, group_id: groupId,
  group: { id: groupId, group_name: groupId === 0 ? 'USER' : 'DOC', description: 'Nhóm quyền' },
});
const page = (items: PermissionListItem[], current = 0, hasNext = false): PermissionsResponse => ({
  success: true,
  data: { items, pagination: { page: current, page_size: 2, total: 3, total_pages: 2, has_next: hasNext, has_previous: current > 0 } },
});

function mount(path = '/users/new') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  clients.push(client);
  render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[path]}><Routes>
    <Route path="/users" element={<UsersPage />} />
    <Route path="/users/new" element={<CreateUserPage />} />
  </Routes></MemoryRouter></QueryClientProvider>);
  return client;
}

it('navigates to a new page, loads every permission page and posts numeric IDs with the exact create contract', async () => {
  const requestedPages: unknown[] = [];
  const payloads: unknown[] = [];
  vi.spyOn(axiosClient.defaults, 'adapter', 'get').mockReturnValue(async (config) => {
    let data: unknown;
    if (config.url === '/permissions') {
      expect(axiosClient.getUri(config)).toContain('/api/v1/permissions');
      requestedPages.push(config.params?.page);
      data = config.params?.page === undefined
        ? page([permission(0, 'USER_VIEW', 'Xem'), permission(1, 'USER_CREATE', 'Tạo mới')], 0, true)
        : page([permission(2, 'DOC_EXPORT', 'Xuất dữ liệu', 1)], 1);
    } else if (config.method === 'post') {
      expect(config.url).toBe('/users');
      payloads.push(JSON.parse(config.data));
      data = { success: true };
    } else if (config.url === '/roles') {
      data = { success: true, roles: [] };
    } else {
      data = { success: true, data: { items: [], pagination: { page: 1, page_size: 5, total: 0, total_pages: 0, has_next: false, has_previous: false } } };
    }
    return { data, status: 200, statusText: 'OK', headers: {}, config };
  });
  const client = mount('/users');
  fireEvent.click(await screen.findByRole('button', { name: 'Thêm Người Dùng' }));
  await screen.findByRole('heading', { name: 'Thêm Người Dùng Mới' });
  const userView = await screen.findByRole('checkbox', { name: 'USER: Xem (USER_VIEW)' });
  expect(requestedPages).toEqual([undefined, 1]);
  fireEvent.click(userView);
  const group = screen.getByRole('checkbox', { name: 'Chọn nhóm USER' }) as HTMLInputElement;
  expect(group.indeterminate).toBe(true);
  fireEvent.click(group);
  expect(group.checked).toBe(true);
  const all = screen.getByRole('checkbox', { name: 'Chọn tất cả quyền' }) as HTMLInputElement;
  fireEvent.click(all);
  expect(all.checked).toBe(true);
  fireEvent.click(all);
  expect((userView as HTMLInputElement).checked).toBe(false);
  fireEvent.click(userView);
  fireEvent.change(screen.getByLabelText('Địa chỉ Email'), { target: { value: 'user@example.com' } });
  fireEvent.change(screen.getByLabelText('Mật khẩu khởi tạo'), { target: { value: 'Example@12345' } });
  const superAdmin = screen.getByRole('checkbox', { name: /Super Admin/ }) as HTMLInputElement;
  expect(superAdmin.checked).toBe(false);
  fireEvent.click(superAdmin);
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  fireEvent.click(screen.getByRole('button', { name: 'Lưu Người Dùng' }));
  await screen.findByRole('button', { name: 'Thêm Người Dùng' });
  expect(payloads).toEqual([{ email: 'user@example.com', password: 'Example@12345', permission_ids: [0], is_super_admin: true }]);
  expect(invalidate).toHaveBeenCalledWith({ queryKey: [['users']] });
});

it('blocks saving on permission failure and allows retrying an empty result', async () => {
  const get = vi.spyOn(permissionsApi, 'getAll').mockRejectedValueOnce(new Error('Unavailable')).mockResolvedValue(page([]));
  mount();
  await screen.findByRole('alert');
  expect((screen.getByRole('button', { name: 'Lưu Người Dùng' }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
  await screen.findByText('Chưa có quyền nào trong hệ thống.');
  expect(get).toHaveBeenCalledTimes(2);
});

it('rejects repeated pagination instead of displaying an incomplete matrix', async () => {
  vi.spyOn(permissionsApi, 'getAll').mockResolvedValue(page([permission(1, 'USER_VIEW', 'Xem')], 0, true));
  await expect(loadPermissionModules()).rejects.toThrow('trang quyền bị lặp');
});

it('keeps form values when creating the user fails', async () => {
  vi.spyOn(permissionsApi, 'getAll').mockResolvedValue(page([permission(1, 'USER_VIEW', 'Xem')]));
  vi.spyOn(axiosClient, 'post').mockResolvedValue({ success: false, message: 'Email đã tồn tại' });
  mount();
  fireEvent.click(await screen.findByRole('checkbox', { name: 'USER: Xem (USER_VIEW)' }));
  fireEvent.change(screen.getByLabelText('Địa chỉ Email'), { target: { value: 'user@example.com' } });
  fireEvent.change(screen.getByLabelText('Mật khẩu khởi tạo'), { target: { value: 'Example@12345' } });
  fireEvent.click(screen.getByRole('button', { name: 'Lưu Người Dùng' }));
  await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Email đã tồn tại'));
  expect((screen.getByLabelText('Địa chỉ Email') as HTMLInputElement).value).toBe('user@example.com');
  expect((screen.getByRole('checkbox', { name: 'USER: Xem (USER_VIEW)' }) as HTMLInputElement).checked).toBe(true);
});
