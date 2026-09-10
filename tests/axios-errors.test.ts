import { afterEach, expect, it, vi } from 'vitest';
import { AxiosError, CanceledError } from 'axios';
import axiosClient from '../src/services/axiosClient';
import { notify } from '../src/stores/notificationStore';
import { useAuthStore } from '../src/stores/authStore';

afterEach(() => vi.restoreAllMocks());

it('does not show a network notification when a request is canceled', async () => {
  useAuthStore.getState().clearSession();
  const notification = vi.spyOn(notify, 'error').mockReturnValue('test');
  const controller = new AbortController();
  controller.abort();
  await expect(axiosClient.get('/documents', { signal: controller.signal })).rejects.toBeInstanceOf(CanceledError);
  expect(notification).not.toHaveBeenCalled();
});

it.each([
  ['ECONNABORTED', 'Hết thời gian chờ'],
  ['ETIMEDOUT', 'Hết thời gian chờ'],
  ['ERR_NETWORK', 'Lỗi kết nối mạng'],
])('reports %s accurately and respects skipGlobalError', async (code, title) => {
  useAuthStore.getState().clearSession();
  const notification = vi.spyOn(notify, 'error').mockReturnValue('test');
  const adapter = async (config: any) => { throw new AxiosError('failure', code, config); };
  await expect(axiosClient.get('/documents', { adapter })).rejects.toHaveProperty('code', code);
  expect(notification).toHaveBeenCalledWith(expect.any(String), title);
  notification.mockClear();
  await expect(axiosClient.get('/documents', { adapter, skipGlobalError: true })).rejects.toHaveProperty('code', code);
  expect(notification).not.toHaveBeenCalled();
});
