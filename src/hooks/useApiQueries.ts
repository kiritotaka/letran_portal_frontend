import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { permissionsApi, usersApi, systemApi, employeesApi, documentsApi } from '../services/api';
import { notify } from '../stores/notificationStore';
import { User, Role, Employee, UploadedDocument, PaginationMeta } from '../types';

// ==================== QUERY KEYS ====================
export const QUERY_KEYS = {
  PERMISSIONS: ['permissions'],
  ROLES: ['roles'],
  USERS: ['users'],
  AUDIT_LOGS: ['audit_logs'],
  EMPLOYEES: ['employees'],
  DOCUMENTS: ['documents']
};

// ==================== PERMISSIONS & ROLES HOOKS ====================
export const usePermissions = () => {
  return useQuery({
    queryKey: QUERY_KEYS.PERMISSIONS,
    queryFn: async () => {
      const res = await permissionsApi.getAll();
      return (res as any).data || res;
    }
  });
};

export const useRoles = () => {
  return useQuery({
    queryKey: QUERY_KEYS.ROLES,
    queryFn: async () => {
      const res = await permissionsApi.getRoles();
      return (res as any).data?.roles || (res as any).roles || [];
    }
  });
};

export const useUpdateRolePermissions = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ roleId, permissions }: { roleId: string; permissions: string[] }) =>
      permissionsApi.updateRolePermissions(roleId, permissions),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ROLES });
      notify.success('Cập nhật phân quyền cho vai trò thành công!');
    }
  });
};

export const useCreateRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      name,
      description,
      permissions
    }: {
      name: string;
      description: string;
      permissions: string[];
    }) => permissionsApi.createRole(name, description, permissions),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ROLES });
      notify.success('Tạo vai trò người dùng mới thành công!');
    }
  });
};

export const useDeleteRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (roleId: string) => permissionsApi.deleteRole(roleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ROLES });
      notify.success('Đã xóa vai trò thành công!');
    }
  });
};

// ==================== USERS HOOKS ====================
export const useUsers = (params?: {
  page?: number;
  limit?: number;
  search?: string;
  roleId?: string;
}) => {
  return useQuery({
    queryKey: [QUERY_KEYS.USERS, params],
    queryFn: async () => {
      const res = await usersApi.getAll(params);
      const resData = res.data;
      const usersList: User[] = resData.users || resData.data || [];
      const pagination: PaginationMeta = resData.pagination || {
        page: params?.page || 1,
        limit: params?.limit || 10,
        total: usersList.length,
        totalPages: 1
      };
      return { users: usersList, pagination };
    }
  });
};

export const useCreateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      email: string;
      name: string;
      roleId: string;
      department?: string;
      is_first_login?: boolean;
      password?: string;
    }) => usersApi.createUser(data),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.USERS] });
      const user = data?.data?.user || data?.user;
      notify.success(
        `Đã tạo tài khoản ${user?.email || ''} (is_first_login=${user?.is_first_login})`
      );
    }
  });
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<User> }) =>
      usersApi.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.USERS] });
      notify.success('Cập nhật thông tin người dùng thành công!');
    }
  });
};

export const useResetFirstLogin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => usersApi.resetFirstLogin(id),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.USERS] });
      const user = data?.data?.user || data?.user;
      notify.success(
        `Đã kích hoạt cờ is_first_login=true cho ${user?.email || 'người dùng'}. Mật khẩu tạm: Temp@12345`
      );
    }
  });
};

// ==================== AUDIT LOGS & SYSTEM ====================
export const useAuditLogs = (params?: { page?: number; limit?: number; search?: string }) => {
  return useQuery({
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
export const useDocuments = (params?: {
  page?: number;
  limit?: number;
  search?: string;
  documentTypeId?: string;
}) => {
  return useQuery({
    queryKey: [QUERY_KEYS.DOCUMENTS, params],
    queryFn: async () => {
      const res = await documentsApi.getAll(params);
      const resData = res.data;
      const docsList: UploadedDocument[] = resData.data || [];
      const pagination: PaginationMeta = resData.pagination || {
        page: params?.page || 1,
        limit: params?.limit || 5,
        total: docsList.length,
        totalPages: 1
      };
      return { documents: docsList, pagination };
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
