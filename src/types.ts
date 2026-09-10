export interface UserListItem {
  id: string;
  email: string;
  is_super_admin: boolean;
  is_first_login: boolean;
  created_at: string;
  updated_at: string;
  permissions: string[];
  is_active?: boolean;
}

export interface UserDetail extends UserListItem {
  is_active: boolean;
}

export interface UserDetailResponse {
  success: boolean;
  data: UserDetail;
  message?: string;
}

export interface UpdateUserInput {
  email: string;
  permission_ids: number[];
  is_super_admin: boolean;
  is_active: boolean;
}

export interface ApiPagination {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
}

export interface DocumentRequest {
  id: string;
  task_id: string;
  template_id: string;
  title: string;
  status: string;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentRequestsResponse {
  success: boolean;
  data: { items: DocumentRequest[]; pagination: ApiPagination };
  message?: string;
}

export interface DocumentTypeListItem {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
}

export interface DocumentTypesResponse {
  success: boolean;
  data: { items: DocumentTypeListItem[]; pagination: ApiPagination };
  message?: string;
}

export interface PermissionListItem {
  id: number;
  permission_code: string;
  permission_name: string;
  group_id: number;
  group: {
    id: number;
    group_name: string;
    description: string;
  };
}

export interface PermissionsResponse {
  success: boolean;
  data: { items: PermissionListItem[]; pagination: ApiPagination };
}

export interface CreateUserInput {
  email: string;
  password: string;
  permission_ids: number[];
  is_super_admin: boolean;
}

export interface UsersResponse {
  success: boolean;
  data: {
    items: UserListItem[];
    pagination: ApiPagination;
  };
}

export interface User {
  id: string;
  email: string;
  name: string;
  roleId: string;
  is_first_login: boolean;
  avatar?: string;
  department?: string;
  status: 'active' | 'suspended';
  createdAt: string;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  isSystem?: boolean;
  permissions: string[];
  badgeColor?: string;
}

// Database schema table: permission_groups
export interface PermissionGroup {
  id: number;
  group_name: string;
  description: string;
  created_at?: string;
  created_by?: string | null;
  updated_at?: string;
  updated_by?: string | null;
}

// Database schema table: permissions
export interface PermissionItem {
  id: number;
  group_id: number;
  permission_code: string;
  permission_name: string;
  created_at?: string;
  created_by?: string | null;

  // Compatibility aliases for UI
  code: string; // Same as permission_code (e.g. 'USER_VIEW')
  name: string; // Same as permission_name (e.g. 'Xem thông tin')
  description?: string;
  module?: string;
}

// Hierarchical module grouping for RBAC tree rendering
export interface PermissionModule {
  id: string | number;
  group_id: number;
  group_name: string;
  name: string; // Display name e.g. 'Quản lý người dùng'
  description: string;
  iconName?: string;
  permissions: PermissionItem[];
}

export interface AuthState {
  user: User | null;
  role: Role | null;
  permissions: string[];
  token: string | null;
  isLoading: boolean;
  pendingFirstLoginUser: { email: string; name: string } | null;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  is_first_login?: boolean;
  token?: string;
  user?: User;
  permissions?: string[];
  role?: Role;
}

export interface DocumentType {
  id: string;
  name: string;
  code: string;
  category: string;
  description: string;
  template_url: string;
  template_filename: string;
  template_type: 'excel' | 'docx' | 'pdf';
  template_size: string;
}

export interface UploadedDocument {
  id: string;
  title: string;
  documentTypeId: string;
  documentTypeName: string;
  category: string;
  size: string;
  fileUrl: string;
  thumbnailUrl?: string;
  fileName: string;
  fileType: string;
  date: string;
  createdAt: string;
  uploadedBy?: string;
  status?: 'active' | 'archived';
  source?: 'computer' | 'device' | 'camera';
}

export interface ImageUploadItem {
  id: string;
  name: string;
  size: number;
  sizeFormatted: string;
  previewUrl: string;
  base64Data: string;
  source: 'computer' | 'device' | 'camera';
  status: 'pending' | 'uploading' | 'completed' | 'error';
  errorMessage?: string;
}

// Phân trang & Server-side Search Types
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasPrevPage?: boolean;
  hasNextPage?: boolean;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: PaginationMeta;
  message?: string;
}

export interface Employee {
  id: string;
  code: string;
  name: string;
  position: string;
  department: string;
  email: string;
  phone: string;
  joinDate: string;
  status: 'active' | 'probation' | 'resigned';
}

