import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi, systemApi, employeesApi, documentsApi, documentTypesApi } from '../services/api';
import { notify } from '../stores/notificationStore';
import { Employee, PaginationMeta, CreateUserInput, UpdateUserInput } from '../types';
import { loadPermissionModules } from '../services/permissions';

// ==================== QUERY KEYS ====================
export const QUERY_KEYS = {
  PERMISSIONS: ['permissions'],
  USERS: ['users'],
  AUDIT_LOGS: ['audit_logs'],
  EMPLOYEES: ['employees'],
  DOCUMENTS: ['document-requests'],
  DOCUMENT_TYPES: ['document-types']
};

// ==================== PERMISSIONS & ROLES HOOKS ====================
export const usePermissions = (options?: { enabled?: boolean }) => {
  return useQuery({
    enabled: options?.enabled ?? true,
    queryKey: QUERY_KEYS.PERMISSIONS,
    queryFn: ({ signal }) => loadPermissionModules(signal)
  });
};

// ==================== USERS HOOKS ====================
export const useUsers = (params?: {
  page?: number;
  limit?: number;
  search?: string;
}, options?: { enabled?: boolean }) => {
  return useQuery({
    enabled: options?.enabled ?? true,
    queryKey: [QUERY_KEYS.USERS, params],
    queryFn: async () => {
      const res = await usersApi.getAll(params);
      const { items, pagination: meta } = res.data;
      const pagination: PaginationMeta = {
        page: meta.page,
        limit: meta.page_size,
        total: meta.total,
        totalPages: meta.total_pages,
        hasNextPage: meta.has_next,
        hasPrevPage: meta.has_previous
      };
      return { users: items, pagination };
    }
  });
};

export const useCreateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateUserInput) => usersApi.createUser(data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.USERS] });
      notify.success(`Đã tạo tài khoản ${variables.email}`);
    }
  });
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserInput }) =>
      usersApi.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.USERS] });
      notify.success('Cập nhật thông tin người dùng thành công!');
    }
  });
};

export const useDeactivateUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => usersApi.deactivate(id),
    onSuccess: (user) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.USERS] });
      if (user.is_active) {
        notify.error('Máy chủ vẫn trả về tài khoản đang hoạt động. Vui lòng kiểm tra lại.');
      } else {
        notify.success(`Đã vô hiệu hóa tài khoản ${user.email}`);
      }
    },
  });
};

// ==================== AUDIT LOGS & SYSTEM ====================
export const useAuditLogs = (params?: { page?: number; limit?: number; search?: string }, options?: { enabled?: boolean }) => {
  return useQuery({
    enabled: options?.enabled ?? true,
    queryKey: [QUERY_KEYS.AUDIT_LOGS, params],
    queryFn: async () => {
      const res = await systemApi.getAuditLogs(params);
      const resData = res.data;
      const logsList = resData.logs || resData.data || [];
      const pagination: PaginationMeta = resData.pagination || {
        page: params?.page || 1,
        limit: params?.limit || 10,
        total: logsList.length,
        totalPages: 1
      };
      return { logs: logsList, pagination };
    }
  });
};

// ==================== HR EMPLOYEES HOOKS ====================
export const useEmployees = (params?: {
  page?: number;
  limit?: number;
  search?: string;
  department?: string;
  status?: string;
}) => {
  return useQuery({
    queryKey: [QUERY_KEYS.EMPLOYEES, params],
    queryFn: async () => {
      const res = await employeesApi.getAll(params);
      const resData = res.data;
      const empList: Employee[] = resData.employees || resData.data || [];
      const pagination: PaginationMeta = resData.pagination || {
        page: params?.page || 1,
        limit: params?.limit || 5,
        total: empList.length,
        totalPages: 1
      };
      return { employees: empList, pagination };
    }
  });
};

export const useCreateEmployee = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Employee>) => employeesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.EMPLOYEES] });
      notify.success('Thêm hồ sơ nhân sự mới thành công!');
    }
  });
};

export const useUpdateEmployee = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Employee> }) =>
      employeesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.EMPLOYEES] });
      notify.success('Cập nhật hồ sơ nhân sự thành công!');
    }
  });
};

export const useDeleteEmployee = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => employeesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.EMPLOYEES] });
      notify.success('Đã xóa hồ sơ nhân sự thành công!');
    }
  });
};

// ==================== DOCUMENTS HOOKS ====================
export const useDocumentTypes = () => useQuery({
  queryKey: QUERY_KEYS.DOCUMENT_TYPES,
  queryFn: async ({ signal }) => {
    const response = await documentTypesApi.getList(signal);
    if (!response.success) throw new Error(response.message || 'Không thể tải loại tài liệu.');
    return response.data;
  },
});

export const useDocuments = (params?: {
  page?: number;
  page_size?: number;
  document_type_id?: string;
  search?: string;
}) => {
  return useQuery({
    queryKey: [QUERY_KEYS.DOCUMENTS, params],
    queryFn: async ({ signal }) => {
      const res = await documentsApi.getAll(params, signal);
      if (!res.success) throw new Error(res.message || 'Không thể tải danh sách tài liệu.');
      const { items, pagination: meta } = res.data;
      const pagination: PaginationMeta = {
        page: meta.page,
        limit: meta.page_size,
        total: meta.total,
        totalPages: meta.total_pages,
        hasNextPage: meta.has_next,
        hasPrevPage: meta.has_previous,
      };
      return { documents: items, pagination };
    }
  });
};

export const useResetDemoData = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => systemApi.resetDemoData(),
    onSuccess: () => {
      queryClient.invalidateQueries();
      notify.success('Đã khôi phục dữ liệu mẫu hệ thống ban đầu!');
    }
  });
};
