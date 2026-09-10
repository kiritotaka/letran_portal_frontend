import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { axiosClient } from '../src/services/axiosClient';
import { useUsers } from '../src/hooks/useApiQueries';
import type { UsersResponse } from '../src/types';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it.each([false, true])('reads the /users envelope through the Axios interceptor (empty=%s)', async (empty) => {
  const body: UsersResponse = {
    success: true,
    data: {
      items: empty ? [] : [{
        id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
        email: 'admin@example.com',
        is_super_admin: true,
        is_first_login: true,
        created_at: '2026-09-09T04:09:35.168Z',
        updated_at: '2026-09-09T04:09:35.168Z',
        permissions: ['USER_VIEW'],
      }],
      pagination: {
        page: empty ? 0 : 2,
        page_size: empty ? 0 : 5,
        total: empty ? 0 : 11,
        total_pages: empty ? 0 : 3,
        has_next: !empty,
        has_previous: !empty,
      },
    },
  };
  vi.spyOn(axiosClient.defaults, 'adapter', 'get').mockReturnValue(async (config) => ({
    data: body, status: 200, statusText: 'OK', headers: {}, config,
  }));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const { result, unmount } = renderHook(() => useUsers({ page: 2, limit: 5 }), {
    wrapper: ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>,
  });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toEqual({
    users: body.data.items,
    pagination: {
      page: empty ? 0 : 2,
      limit: empty ? 0 : 5,
      total: empty ? 0 : 11,
      totalPages: empty ? 0 : 3,
      hasNextPage: !empty,
      hasPrevPage: !empty,
    },
  });
  unmount();
  client.clear();
});
