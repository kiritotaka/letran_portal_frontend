import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DashboardPage from '../src/pages/DashboardPage';
import { useAuthStore } from '../src/stores/authStore';
import { permissionsApi, usersApi, systemApi } from '../src/services/api';

vi.mock('../src/context/AuthContext', () => ({ useAuth: () => useAuthStore() }));
const clients: QueryClient[] = [];
afterEach(() => { cleanup(); clients.forEach((c) => c.clear()); clients.length = 0; useAuthStore.getState().clearSession(); vi.restoreAllMocks(); });
function login(permissions: string[], admin = false) {
  useAuthStore.getState().saveSession({ access_token: 'access', refresh_token: 'refresh', expires_in: 3600, expires_at: null,
    user: { id: 'user-1', email: 'user@example.com', is_first_login: false, is_super_admin: admin, permissions } });
}
function mount() {
  const pagination = { page: 1, page_size: 5, total: 0, total_pages: 0, has_next: false, has_previous: false };
  const permissions = vi.spyOn(permissionsApi, 'getAll').mockResolvedValue({ success: true, data: { items: [], pagination } });
  const users = vi.spyOn(usersApi, 'getAll').mockResolvedValue({ success: true, data: { items: [], pagination } });
  const audit = vi.spyOn(systemApi, 'getAuditLogs').mockResolvedValue({ data: { logs: [], pagination: { page: 1, limit: 5, total: 0, totalPages: 0 } } } as never);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  clients.push(client);
  render(<QueryClientProvider client={client}><MemoryRouter><DashboardPage /></MemoryRouter></QueryClientProvider>);
  return { permissions, users, audit, client };
}

it('makes no dashboard API calls when the session has no view permissions', async () => {
  login(['USER_UPDATE']);
  const spies = mount();
  await act(async () => {});
  expect(spies.permissions).not.toHaveBeenCalled();
  expect(spies.users).not.toHaveBeenCalled();
  expect(spies.audit).not.toHaveBeenCalled();
  expect(screen.queryByText('Người Dùng Đã Cấp')).toBeNull();
  expect(screen.queryByText('Nhóm Quyền')).toBeNull();
  expect(screen.queryByText('Nhật Ký Hoạt Động Gần Nhất (Audit Trail)')).toBeNull();
  expect(screen.getByText('Quyền Của Bạn')).toBeTruthy();
});

it.each(['USER_VIEW', 'PERM_VIEW', 'settings.audit'])('only requests the data allowed by %s', async (permission) => {
  login([permission]);
  const spies = mount();
  await waitFor(() => expect(spies.client.isFetching()).toBe(0));
  expect(spies.users).toHaveBeenCalledTimes(permission === 'USER_VIEW' ? 1 : 0);
  expect(spies.permissions).toHaveBeenCalledTimes(permission === 'PERM_VIEW' ? 1 : 0);
  expect(spies.audit).toHaveBeenCalledTimes(permission === 'settings.audit' ? 1 : 0);
});

it('hides cached data and stops automatic refetches after permissions are revoked', async () => {
  login([], true);
  const spies = mount();
  await waitFor(() => expect(spies.client.isFetching()).toBe(0));
  expect(spies.users).toHaveBeenCalledTimes(1);
  expect(spies.permissions).toHaveBeenCalledTimes(1);
  expect(spies.audit).toHaveBeenCalledTimes(1);
  act(() => login([]));
  await act(async () => { await spies.client.invalidateQueries(); });
  expect(spies.users).toHaveBeenCalledTimes(1);
  expect(spies.permissions).toHaveBeenCalledTimes(1);
  expect(spies.audit).toHaveBeenCalledTimes(1);
  expect(screen.queryByText('Người Dùng Đã Cấp')).toBeNull();
  expect(screen.queryByText('Nhóm Quyền')).toBeNull();
  expect(screen.queryByText('Nhật Ký Hoạt Động Gần Nhất (Audit Trail)')).toBeNull();
});
