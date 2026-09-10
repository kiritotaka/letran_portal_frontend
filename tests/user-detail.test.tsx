import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { axiosClient } from '../src/services/axiosClient';
import UserDetailPage from '../src/pages/UserDetailPage';
import UsersPage from '../src/pages/UsersPage';
import type { UserListItem } from '../src/types';

const auth = vi.hoisted(() => ({ canUpdate: true }));
vi.mock('../src/context/AuthContext', () => ({ useAuth: () => ({
  user: { roleId: 'viewer' }, hasPermission: (code: string) => code !== 'USER_UPDATE' || auth.canUpdate,
}) }));
const clients: QueryClient[] = [];
afterEach(() => { cleanup(); clients.forEach((c) => c.clear()); clients.length = 0; auth.canUpdate = true; vi.restoreAllMocks(); });
const user: UserListItem = {
  id: 'user-1', email: 'user@example.com', permissions: ['USER_VIEW'], is_super_admin: false,
  is_first_login: false, created_at: '2026-09-09T04:31:51.882Z', updated_at: '2026-09-09T04:31:51.882Z',
};

function setup(selected: UserListItem | null = user, fromList = false, failPatch = false) {
  const requests: { method?: string; url?: string; data: unknown }[] = [];
  let listUser = selected ?? user;
  vi.spyOn(axiosClient.defaults, 'adapter', 'get').mockReturnValue(async (config) => {
    requests.push({ method: config.method, url: config.url, data: config.data ? JSON.parse(config.data) : undefined });
    let data: unknown;
    if (config.url === '/permissions') data = { success: true, data: {
      items: [{ id: 7, permission_code: 'USER_VIEW', permission_name: 'Xem', group_id: 1, group: { id: 1, group_name: 'USER', description: 'Users' } }],
      pagination: { page: 1, page_size: 10, total: 1, total_pages: 1, has_next: false, has_previous: false },
    } };
    else if (config.method === 'patch') {
      const body = JSON.parse(config.data);
      listUser = { ...listUser, email: body.email, is_active: body.is_active, is_super_admin: body.is_super_admin };
      data = failPatch ? { success: false, message: 'Update failed' } : { success: true, data: listUser };
    } else if (config.method === 'post') {
      listUser = { ...listUser, is_active: false };
      data = { success: true, data: listUser };
    } else if (config.url === '/roles') data = { success: true, roles: [] };
    else if (config.url?.startsWith('/users?')) data = { success: true, data: { items: [listUser], pagination: {
      page: 1, page_size: 5, total: 1, total_pages: 1, has_next: false, has_previous: false,
    } } };
    else throw new Error(`Unexpected request: ${config.url}`);
    return { data, status: 200, statusText: 'OK', headers: {}, config };
  });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  clients.push(client);
  render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[
    fromList ? '/users' : { pathname: '/users/user-1', state: selected ? { user: selected } : null },
  ]}><Routes>
    <Route path="/users" element={<UsersPage />} />
    <Route path="/users/:userId" element={<UserDetailPage />} />
  </Routes></MemoryRouter></QueryClientProvider>);
  return requests;
}

it('opens the selected user without a detail GET and PATCHes the exact contract', async () => {
  const requests = setup(user, true);
  fireEvent.click(await screen.findByRole('button', { name: 'Xem chi tiết user@example.com' }));
  const permission = await screen.findByRole('checkbox', { name: 'USER: Xem (USER_VIEW)' });
  expect((permission as HTMLInputElement).checked).toBe(true);
  expect((screen.getByLabelText('Trạng thái tài khoản') as HTMLSelectElement).value).toBe('');
  expect((screen.getByRole('button', { name: 'Lưu thay đổi' }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.change(screen.getByLabelText('Trạng thái tài khoản'), { target: { value: 'false' } });
  fireEvent.change(screen.getByLabelText('Địa chỉ Email'), { target: { value: 'updated@example.com' } });
  fireEvent.click(screen.getByRole('checkbox', { name: /Super Admin/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
  await waitFor(() => expect(requests.some((r) => r.method === 'patch')).toBe(true));
  expect(requests.find((r) => r.method === 'patch')).toEqual({ method: 'patch', url: '/users/user-1', data: {
    email: 'updated@example.com', permission_ids: [7], is_super_admin: true, is_active: false,
  } });
  expect(requests.some((r) => r.method === 'get' && r.url === '/users/user-1')).toBe(false);
  await waitFor(() => expect((screen.getByRole('button', { name: 'Lưu thay đổi' }) as HTMLButtonElement).disabled).toBe(false));
  fireEvent.click(screen.getByRole('button', { name: 'Hủy thay đổi' }));
  expect((screen.getByLabelText('Địa chỉ Email') as HTMLInputElement).value).toBe('updated@example.com');
});

it('renders readonly without USER_UPDATE and hides deactivate', async () => {
  auth.canUpdate = false;
  setup({ ...user, is_active: true }, true);
  fireEvent.click(await screen.findByRole('button', { name: 'Xem chi tiết user@example.com' }));
  const permission = await screen.findByRole('checkbox', { name: 'USER: Xem (USER_VIEW)' });
  expect((permission as HTMLInputElement).disabled).toBe(true);
  expect(screen.getByLabelText('Địa chỉ Email').closest('fieldset')?.disabled).toBe(true);
  expect(screen.queryByRole('button', { name: 'Lưu thay đổi' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Danh sách người dùng' }));
  await screen.findByRole('button', { name: 'Xem chi tiết user@example.com' });
  expect(screen.queryByRole('button', { name: 'Vô hiệu hóa user@example.com' })).toBeNull();
});

it('handles direct entry without fetching a nonexistent detail endpoint', () => {
  const requests = setup(null);
  expect(screen.getByRole('status').textContent).toContain('Chưa có thông tin người dùng được chọn');
  expect(requests.some((r) => r.url === '/users/user-1')).toBe(false);
});

it('deactivates with POST after confirmation and refreshes the list', async () => {
  const requests = setup({ ...user, is_active: true }, true);
  const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
  const button = await screen.findByRole('button', { name: 'Vô hiệu hóa user@example.com' });
  fireEvent.click(button);
  expect(requests.some((r) => r.method === 'post')).toBe(false);
  fireEvent.click(button);
  await screen.findByText('Đã vô hiệu hóa');
  expect(confirm).toHaveBeenCalledTimes(2);
  expect(requests.find((r) => r.method === 'post')).toEqual({ method: 'post', url: '/users/user-1/deactivate', data: undefined });
  expect((button as HTMLButtonElement).disabled).toBe(true);
});

it('retains edits when PATCH fails', async () => {
  setup({ ...user, is_active: true }, false, true);
  await screen.findByRole('checkbox', { name: 'USER: Xem (USER_VIEW)' });
  fireEvent.change(screen.getByLabelText('Địa chỉ Email'), { target: { value: 'changed@example.com' } });
  fireEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
  await screen.findByRole('alert');
  expect((screen.getByLabelText('Địa chỉ Email') as HTMLInputElement).value).toBe('changed@example.com');
});
