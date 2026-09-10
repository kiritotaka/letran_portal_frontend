import { permissionsApi } from './api';
import type { PermissionListItem, PermissionModule } from '../types';

export async function loadPermissionModules(signal?: AbortSignal) {
  const items = new Map<string, PermissionListItem>();
  const visitedPages = new Set<number>();
  let page: number | undefined;

  // Let the server choose the first page; follow its pagination thereafter.
  while (true) {
    const response = await permissionsApi.getAll(page, signal);
    if (!response.success) throw new Error('Không thể tải danh sách quyền.');
    const { items: batch, pagination } = response.data;
    if (visitedPages.has(pagination.page)) {
      throw new Error('Máy chủ trả về trang quyền bị lặp. Vui lòng thử lại.');
    }
    visitedPages.add(pagination.page);
    batch.forEach((item) => items.set(item.permission_code, item));
    if (!pagination.has_next) break;
    if (batch.length === 0) throw new Error('Danh sách quyền chưa được tải đầy đủ.');
    page = pagination.page + 1;
  }

  const groups = new Map<number, PermissionModule>();
  for (const item of items.values()) {
    let group = groups.get(item.group_id);
    if (!group) {
      group = {
        id: item.group_id,
        group_id: item.group_id,
        group_name: item.group.group_name,
        name: item.group.group_name,
        description: item.group.description,
        permissions: [],
      };
      groups.set(item.group_id, group);
    }
    group.permissions.push({
      ...item,
      code: item.permission_code,
      name: item.permission_name,
      description: '',
    });
  }
  return {
    modules: [...groups.values()],
    permission_groups: [...groups.values()].map((group) => ({
      id: group.group_id, group_name: group.group_name, description: group.description,
    })),
    permissions: [...groups.values()].flatMap((group) => group.permissions),
    allCodes: [...items.keys()],
    totalCount: items.size,
  };
}
