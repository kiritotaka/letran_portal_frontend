import type { SessionResponse, PasswordResponse } from "./sessionTypes";
import axiosClient from "./axiosClient";
import {
  ApiResponse,
  PermissionsResponse,
  CreateUserInput,
  UpdateUserInput,
  UserDetailResponse,
  UsersResponse,
  DocumentType,
  DocumentRequestsResponse,
  DocumentTypesResponse,
  UploadedDocument,
  PaginationMeta,
  Employee,
} from "../types";

/**
 * Nơi tập trung toàn bộ các hàm gọi API của hệ thống
 * Sử dụng Axios Client đã cấu hình Interceptor và baseURL từ VITE_API_URL
 */

// Auth endpoints return the response body (axiosClient unwraps it).
export const authApi = {
  login: (email: string, password: string) =>
    axiosClient.post<SessionResponse, SessionResponse>(
      "/auth/login",
      { email, password },
      { skipGlobalError: true },
    ),
  changePasswordFirstLogin: (
    email: string,
    currentPassword: string,
    newPassword: string,
  ) =>
    axiosClient.post<PasswordResponse, PasswordResponse>(
      "/auth/change-password-first-login",
      { email, current_password: currentPassword, new_password: newPassword },
      { skipGlobalError: true },
    ),
  changePassword: (
    email: string,
    currentPassword: string,
    newPassword: string,
  ) =>
    axiosClient.post<PasswordResponse, PasswordResponse>(
      "/auth/change-password",
      { email, current_password: currentPassword, new_password: newPassword },
      { skipGlobalError: true },
    ),
};

// PERMISSIONS & ROLES APIs
export const permissionsApi = {
  // API_BASE_URL already includes /api/v1.
  getAll: (page?: number, signal?: AbortSignal) =>
    axiosClient.get<PermissionsResponse, PermissionsResponse>("/permissions", {
      params: page === undefined ? undefined : { page },
      signal,
      skipLoading: true,
    }),


};

// USERS APIs (Hỗ trợ Server-side search, lọc và phân trang)
export const usersApi = {
  getAll: (params?: {
    page?: number;
    limit?: number;
    search?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.page) query.append("page", String(params.page));
    if (params?.limit) query.append("limit", String(params.limit));
    if (params?.search) query.append("search", params.search);
    const qs = query.toString();
    return axiosClient.get<UsersResponse, UsersResponse>(
      qs ? `/users?${qs}` : "/users",
    );
  },

  createUser: async (data: CreateUserInput) => {
    const response = await axiosClient.post<
      { success: boolean; message?: string },
      { success: boolean; message?: string }
    >("/users", data);
    if (!response.success) throw new Error(response.message || "Không thể tạo người dùng.");
    return response;
  },

  updateUser: async (id: string, data: UpdateUserInput) => {
    const response = await axiosClient.patch<UserDetailResponse, UserDetailResponse>(
      `/users/${encodeURIComponent(id)}`, data,
    );
    if (!response.success) throw new Error(response.message || "Không thể cập nhật người dùng.");
    return response.data;
  },

  deactivate: async (id: string) => {
    const response = await axiosClient.post<UserDetailResponse, UserDetailResponse>(
      `/users/${encodeURIComponent(id)}/deactivate`,
    );
    if (!response.success) throw new Error(response.message || "Không thể vô hiệu hóa người dùng.");
    return response.data;
  },

};

// SYSTEM & AUDIT APIs (Hỗ trợ Server-side search & phân trang)
export const systemApi = {
  getAuditLogs: (params?: {
    page?: number;
    limit?: number;
    search?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.page) query.append("page", String(params.page));
    if (params?.limit) query.append("limit", String(params.limit));
    if (params?.search) query.append("search", params.search);
    const qs = query.toString();
    return axiosClient.get<{
      success: boolean;
      logs: Array<{
        id: string;
        action: string;
        detail: string;
        performedBy: string;
        timestamp: string;
        ip?: string;
      }>;
      data: Array<{
        id: string;
        action: string;
        detail: string;
        performedBy: string;
        timestamp: string;
        ip?: string;
      }>;
      pagination: PaginationMeta;
    }>(qs ? `/audit-logs?${qs}` : "/audit-logs");
  },

  resetDemoData: () =>
    axiosClient.post<{
      success: boolean;
      message: string;
    }>("/seed-reset"),
};

// HR EMPLOYEES APIs (Hỗ trợ Server-side search & phân trang)
export const employeesApi = {
  getAll: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    department?: string;
    status?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.page) query.append("page", String(params.page));
    if (params?.limit) query.append("limit", String(params.limit));
    if (params?.search) query.append("search", params.search);
    if (params?.department && params.department !== "all")
      query.append("department", params.department);
    if (params?.status && params.status !== "all")
      query.append("status", params.status);
    const qs = query.toString();
    return axiosClient.get<{
      success: boolean;
      employees: Employee[];
      data: Employee[];
      pagination: PaginationMeta;
    }>(qs ? `/employees?${qs}` : "/employees");
  },

  create: (data: Partial<Employee>) =>
    axiosClient.post<{ success: boolean; message: string; data: Employee }>(
      "/employees",
      data,
    ),

  update: (id: string, data: Partial<Employee>) =>
    axiosClient.put<{ success: boolean; message: string; data: Employee }>(
      `/employees/${id}`,
      data,
    ),

  delete: (id: string) =>
    axiosClient.delete<{ success: boolean; message: string }>(
      `/employees/${id}`,
    ),
};

// DOCUMENT TYPES APIs (Dùng cho Autocomplete & Tải file template mẫu)
export const documentTypesApi = {
  getList: (signal?: AbortSignal) =>
    axiosClient.get<DocumentTypesResponse, DocumentTypesResponse>("/document-types", {
      params: { page: 1, page_size: 100 },
      signal,
      skipLoading: true,
    }),
  getAll: (q?: string) =>
    axiosClient.get<{ success: boolean; data: DocumentType[] }, { success: boolean; data: DocumentType[] }>(
      q ? `/document-types?q=${encodeURIComponent(q)}` : "/document-types",
      { skipLoading: true }, // skip loading overlay để trải nghiệm gõ autocomplete mượt mà
    ),
  getTemplateDownloadUrl: (filename: string) =>
    `/api/document-types/template/${encodeURIComponent(filename)}`,
};

// DOCUMENTS APIs (Kho tài liệu với Server-side search & phân trang)
export const documentsApi = {
  getAll: (params: {
    page?: number;
    page_size?: number;
    document_type_id?: string;
    search?: string;
  } = {}, signal?: AbortSignal) =>
    axiosClient.get<DocumentRequestsResponse, DocumentRequestsResponse>(
      "/document-requests", {
        params: {
          page: params.page ?? 1,
          page_size: params.page_size ?? 5,
          document_type_id: params.document_type_id || undefined,
          search: params.search?.trim() || undefined,
        },
        signal,
      },
    ),
  uploadSingle: (payload: {
    documentTypeId: string;
    documentTypeName: string;
    fileName: string;
    fileSize: number;
    fileType: string;
    imageBase64: string;
    source: "computer" | "device" | "camera";
    index: number;
    total: number;
  }) =>
    axiosClient.post<{
      success: boolean;
      message: string;
      data: UploadedDocument;
      progress: { savedIndex: number; total: number };
    }>("/documents/upload-single", payload, {
      skipLoading: true, // Không dùng global loading overlay để dành riêng cho thanh Progress Bar trực quan
    }),
  delete: (id: string) =>
    axiosClient.delete<{ success: boolean; message: string }>(
      `/documents/${id}`,
    ),
  exportPackage: (payload: {
    documentTypeId: string;
    documentTypeName: string;
    documentTypeCode?: string;
    imageFiles: Array<{ name: string; sizeFormatted: string; source?: string }>;
    format?: "pdf" | "excel" | "docx";
  }) =>
    axiosClient.post("/documents/export-package", payload, {
      responseType: "blob",
    }),
};

// TEST APIs (Simulated network latency for loading overlay & anti-flickering tests)
export const testApi = {
  simulateDelay: (ms: number, name?: string, skipLoading?: boolean) =>
    axiosClient.get<{
      success: boolean;
      delayedMs: number;
      name: string;
      timestamp: string;
    }>(`/test/delay?ms=${ms}&name=${encodeURIComponent(name || "API")}`, {
      skipLoading,
    }),
};

export default {
  auth: authApi,
  permissions: permissionsApi,
  users: usersApi,
  employees: employeesApi,
  system: systemApi,
  documentTypes: documentTypesApi,
  documents: documentsApi,
  test: testApi,
};
