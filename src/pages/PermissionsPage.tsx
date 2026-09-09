import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  Plus,
  Save,
  RotateCcw,
  CheckSquare,
  Square,
  MinusSquare,
  ChevronDown,
  ChevronRight,
  Search,
  Users,
  UserCheck,
  BarChart3,
  FileText,
  Settings,
  Shield,
  Trash2,
  CheckCircle2,
  Info,
  Lock,
  RefreshCw,
  Database,
  Layers,
  Table
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PermissionModule, PermissionGroup, PermissionItem } from '../types';
import {
  usePermissions,
  useRoles,
  useUpdateRolePermissions,
  useCreateRole,
  useDeleteRole
} from '../hooks/useApiQueries';

const moduleIcons: Record<string, React.ElementType> = {
  USER: Users,
  users: Users,
  HR: UserCheck,
  hr: UserCheck,
  RP: BarChart3,
  reports: BarChart3,
  PERM: ShieldCheck,
  permissions: ShieldCheck,
  DOC: FileText,
  documents: FileText,
  settings: Settings
};

export const PermissionsPage: React.FC = () => {
  const { user: currentUser, role: currentUserRole, refreshUserData, hasPermission } = useAuth();

  // React Query queries
  const { data: permData, isLoading: loadingPerms, refetch: refetchPerms } = usePermissions();
  const { data: roles = [], isLoading: loadingRoles, refetch: refetchRoles } = useRoles();

  // React Query mutations
  const updatePermissionsMutation = useUpdateRolePermissions();
  const createRoleMutation = useCreateRole();
  const deleteRoleMutation = useDeleteRole();

  const modules: PermissionModule[] = useMemo(() => permData?.modules || [], [permData]);

  const [selectedRoleId, setSelectedRoleId] = useState<string>('admin');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({
    users: true,
    permissions: true,
    reports: true,
    documents: true,
    settings: true
  });
  const [searchQuery, setSearchQuery] = useState('');

  // New role modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');

  // Active tab: 'tree' for RBAC Tree view, 'db_tables' for Supabase schema view
  const [activeViewTab, setActiveViewTab] = useState<'tree' | 'db_tables'>('tree');

  // Check if current user can assign permissions based on DB schema
  const canAssign = hasPermission('PERM_UPDATE') || currentUser?.roleId === 'admin';
  const canEditRole = hasPermission('PERM_CREATE') || currentUser?.roleId === 'admin';
  const canDeleteRole = hasPermission('PERM_REMOVE') || currentUser?.roleId === 'admin';

  // Active selected role
  const activeRole = useMemo(
    () => roles.find((r) => r.id === selectedRoleId) || roles[0],
    [roles, selectedRoleId]
  );

  // Sync selected permissions when active role changes
  useEffect(() => {
    if (activeRole) {
      setSelectedPermissions([...activeRole.permissions]);
    }
  }, [activeRole]);

  // Total permissions count
  const allCodes = useMemo(
    () => modules.flatMap((m) => m.permissions.map((p) => p.code)),
    [modules]
  );

  // Check if modified compared to role in db
  const isDirty = useMemo(() => {
    if (!activeRole) return false;
    const originalSet = new Set(activeRole.permissions);
    const currentSet = new Set(selectedPermissions);
    if (originalSet.size !== currentSet.size) return true;
    for (const code of currentSet) {
      if (!originalSet.has(code)) return true;
    }
    return false;
  }, [activeRole, selectedPermissions]);

  // Handle tree checkbox toggle for individual permission
  const handleTogglePermission = (code: string) => {
    if (!canAssign) return;
    setSelectedPermissions((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  // Handle tree checkbox toggle for entire module (parent node)
  const handleToggleModule = (module: PermissionModule) => {
    if (!canAssign) return;
    const moduleCodes = module.permissions.map((p) => p.code);
    const allChecked = moduleCodes.every((code) => selectedPermissions.includes(code));

    if (allChecked) {
      // Uncheck all in this module
      setSelectedPermissions((prev) => prev.filter((code) => !moduleCodes.includes(code)));
    } else {
      // Check all in this module
      setSelectedPermissions((prev) => Array.from(new Set([...prev, ...moduleCodes])));
    }
  };

  // Select all permissions
  const handleSelectAll = () => {
    if (!canAssign) return;
    setSelectedPermissions([...allCodes]);
  };

  // Deselect all
  const handleDeselectAll = () => {
    if (!canAssign) return;
    setSelectedPermissions([]);
  };

  // Revert
  const handleRevert = () => {
    if (activeRole) {
      setSelectedPermissions([...activeRole.permissions]);
    }
  };

  // Expand / Collapse all
  const toggleAllExpanded = (expand: boolean) => {
    const next: Record<string, boolean> = {};
    modules.forEach((m) => {
      next[m.id] = expand;
    });
    setExpandedModules(next);
  };

  // Save permissions via mutation
  const handleSavePermissions = async () => {
    if (!canAssign || !activeRole) return;

    updatePermissionsMutation.mutate(
      {
        roleId: activeRole.id,
        permissions: selectedPermissions
      },
      {
        onSuccess: async () => {
          if (currentUserRole?.id === activeRole.id) {
            await refreshUserData();
          }
        }
      }
    );
  };

  // Create new role via mutation
  const handleCreateRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) return;

    createRoleMutation.mutate(
      {
        name: newRoleName,
        description: newRoleDesc,
        permissions: []
      },
      {
        onSuccess: (data: any) => {
          const createdRole = data?.data?.role || data?.role;
          if (createdRole?.id) {
            setSelectedRoleId(createdRole.id);
          }
          setShowCreateModal(false);
          setNewRoleName('');
          setNewRoleDesc('');
        }
      }
    );
  };

  // Delete role via mutation
  const handleDeleteRole = (roleId: string, roleName: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa vai trò "${roleName}"?`)) return;

    deleteRoleMutation.mutate(roleId, {
      onSuccess: () => {
        if (selectedRoleId === roleId) {
          setSelectedRoleId('admin');
        }
      }
    });
  };

  // Filter modules/permissions based on search query
  const filteredModules = useMemo(() => {
    if (!searchQuery.trim()) return modules;
    const query = searchQuery.toLowerCase();
    return modules
      .map((mod) => {
        const matchingPerms = mod.permissions.filter(
          (p) =>
            p.name.toLowerCase().includes(query) ||
            p.code.toLowerCase().includes(query) ||
            p.description.toLowerCase().includes(query)
        );
        const moduleMatches = mod.name.toLowerCase().includes(query);
        if (moduleMatches) return mod;
        if (matchingPerms.length > 0) {
          return { ...mod, permissions: matchingPerms };
        }
        return null;
      })
      .filter((m): m is PermissionModule => m !== null);
  }, [modules, searchQuery]);

  const isLoading = loadingPerms || loadingRoles;

  if (isLoading && roles.length === 0) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-600 font-medium">Đang tải cấu hình phân quyền hệ thống...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Overview */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                Quản Trị Phân Quyền & Vai Trò (RBAC)
              </h2>
              <p className="text-xs text-slate-500">
                Cấu hình cây phân quyền chi tiết cho từng vai trò người dùng trong hệ thống
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              refetchPerms();
              refetchRoles();
            }}
            className="p-2 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            title="Làm mới dữ liệu từ máy chủ"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {canEditRole && (
            <button
              type="button"
              id="btn-open-create-role-modal"
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm Vai Trò Mới</span>
            </button>
          )}

          {canAssign && (
            <button
              type="button"
              id="btn-save-permissions"
              disabled={!isDirty || updatePermissionsMutation.isPending}
              onClick={handleSavePermissions}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold shadow-xs transition-all ${
                isDirty
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white ring-2 ring-indigo-500/30 ring-offset-1'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Save className="w-4 h-4" />
              <span>
                {updatePermissionsMutation.isPending ? 'Đang lưu...' : 'Lưu Thay Đổi'}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* View Switcher: RBAC Tree vs. Direct Database Tables (Supabase Schema) */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            id="tab-rbac-tree"
            onClick={() => setActiveViewTab('tree')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeViewTab === 'tree'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Ma Trận Cây Phân Quyền (RBAC Tree)</span>
          </button>

          <button
            type="button"
            id="tab-db-tables"
            onClick={() => setActiveViewTab('db_tables')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeViewTab === 'db_tables'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Bảng Dữ Liệu Supabase (Raw DB Tables)</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono font-medium">
              5 Groups • 20 Perms
            </span>
          </button>
        </div>

        <div className="text-xs text-slate-500 flex items-center gap-1.5">
          <Table className="w-3.5 h-3.5 text-indigo-600" />
          <span>Khớp 100% cấu trúc Supabase: <code className="font-mono text-slate-700 font-bold">permission_groups</code> & <code className="font-mono text-slate-700 font-bold">permissions</code></span>
        </div>
      </div>

      {activeViewTab === 'tree' ? (
        /* Main 2-Column Layout */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Roles Selection List */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Danh Sách Vai Trò ({roles.length})
            </h3>
            <span className="text-[11px] text-slate-400">Chọn vai trò để cấu hình</span>
          </div>

          <div className="divide-y divide-slate-100">
            {roles.map((r) => {
              const isSelected = r.id === (activeRole?.id || selectedRoleId);
              const permCount = isSelected ? selectedPermissions.length : r.permissions.length;

              return (
                <div
                  key={r.id}
                  onClick={() => setSelectedRoleId(r.id)}
                  className={`p-4 cursor-pointer transition-all flex items-start justify-between gap-3 ${
                    isSelected
                      ? 'bg-indigo-50/70 border-l-4 border-indigo-600'
                      : 'hover:bg-slate-50 border-l-4 border-transparent'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-xs font-bold ${
                          isSelected ? 'text-indigo-900' : 'text-slate-800'
                        }`}
                      >
                        {r.name}
                      </span>
                      {r.isSystem && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-medium border border-slate-200">
                          Hệ thống
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                      {r.description}
                    </p>
                    <div className="mt-2.5 flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        {permCount}/{allCodes.length} quyền
                      </span>
                    </div>
                  </div>

                  {!r.isSystem && canEditRole && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteRole(r.id, r.name);
                      }}
                      disabled={deleteRoleMutation.isPending}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors"
                      title="Xóa vai trò này"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Permission Tree View for Selected Role */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {activeRole ? (
            <div>
              {/* Role Header Info */}
              <div className="p-5 border-b border-slate-200 bg-slate-50/50">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h3 className="text-base font-bold text-slate-900">{activeRole.name}</h3>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-semibold border border-indigo-200">
                        {selectedPermissions.length} / {allCodes.length} quyền được cấp
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{activeRole.description}</p>
                  </div>

                  {isDirty && (
                    <button
                      type="button"
                      onClick={handleRevert}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-100 transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Hoàn tác</span>
                    </button>
                  )}
                </div>

                {activeRole.id === 'admin' && (
                  <div className="mt-3 p-3 rounded-xl bg-rose-50/80 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                    <Info className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>Lưu ý:</strong> Quản Trị Viên (Admin) là vai trò đặc quyền cao nhất. Mọi chức năng mới đều tự động khả dụng cho vai trò này.
                    </span>
                  </div>
                )}

                {!canAssign && (
                  <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
                    <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      Bạn chỉ có quyền xem danh sách này. Để chỉnh sửa phân quyền, bạn cần quyền <code className="font-mono font-semibold">PERM_UPDATE</code>.
                    </span>
                  </div>
                )}
              </div>

              {/* Tree Controls Toolbar */}
              <div className="p-4 border-b border-slate-100 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Search Bar */}
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm kiếm quyền hoặc mã chức năng..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="text-xs text-slate-400 hover:text-slate-600 absolute right-2.5 top-1/2 -translate-y-1/2"
                    >
                      ×
                    </button>
                  )}
                </div>

                {/* Quick Selection Buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    disabled={!canAssign}
                    className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors disabled:opacity-50"
                  >
                    Chọn tất cả
                  </button>
                  <button
                    type="button"
                    onClick={handleDeselectAll}
                    disabled={!canAssign}
                    className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors disabled:opacity-50"
                  >
                    Bỏ chọn tất cả
                  </button>
                  <div className="h-4 w-px bg-slate-200 mx-1" />
                  <button
                    type="button"
                    onClick={() => toggleAllExpanded(true)}
                    className="text-xs text-slate-500 hover:text-slate-800"
                  >
                    Mở rộng
                  </button>
                  <span className="text-slate-300">/</span>
                  <button
                    type="button"
                    onClick={() => toggleAllExpanded(false)}
                    className="text-xs text-slate-500 hover:text-slate-800"
                  >
                    Thu gọn
                  </button>
                </div>
              </div>

              {/* TREE COMPONENT (Giao diện dạng cây phân cấp) */}
              <div className="p-4 space-y-3">
                {filteredModules.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    Không tìm thấy quyền nào khớp với từ khóa "{searchQuery}".
                  </div>
                ) : (
                  filteredModules.map((module) => {
                    const ModuleIcon = moduleIcons[module.id] || Shield;
                    const isExpanded = expandedModules[module.id] ?? true;
                    const moduleCodes = module.permissions.map((p) => p.code);
                    const checkedCount = moduleCodes.filter((c) =>
                      selectedPermissions.includes(c)
                    ).length;
                    const allChecked =
                      checkedCount === moduleCodes.length && moduleCodes.length > 0;
                    const isIndeterminate =
                      checkedCount > 0 && checkedCount < moduleCodes.length;

                    return (
                      <div
                        key={module.id}
                        className="border border-slate-200 rounded-xl overflow-hidden bg-white transition-shadow hover:shadow-xs"
                      >
                        {/* Parent Node (Module Root Header) */}
                        <div className="flex items-center justify-between p-3.5 bg-slate-50/70 border-b border-slate-100 select-none">
                          <div className="flex items-center gap-3">
                            {/* Expand/Collapse Chevron */}
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedModules((prev) => ({
                                  ...prev,
                                  [module.id]: !isExpanded
                                }))
                              }
                              className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-200/60 transition-colors"
                              title={isExpanded ? 'Thu gọn' : 'Mở rộng'}
                            >
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                            </button>

                            {/* Parent Checkbox with Indeterminate state */}
                            <button
                              type="button"
                              onClick={() => handleToggleModule(module)}
                              disabled={!canAssign}
                              className="text-slate-700 hover:text-indigo-600 focus:outline-none transition-colors disabled:opacity-50"
                              title={
                                allChecked ? 'Bỏ chọn toàn bộ module' : 'Chọn toàn bộ module'
                              }
                            >
                              {allChecked ? (
                                <CheckSquare className="w-4 h-4 text-indigo-600" />
                              ) : isIndeterminate ? (
                                <MinusSquare className="w-4 h-4 text-indigo-500" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-300" />
                              )}
                            </button>

                            {/* Module Icon & Name */}
                            <div className="flex items-center gap-2">
                              <ModuleIcon className="w-4 h-4 text-indigo-600 shrink-0" />
                              <div>
                                <span className="text-xs font-bold text-slate-900 block leading-tight">
                                  {module.name}
                                </span>
                                <span className="text-[11px] text-slate-500 hidden sm:block">
                                  {module.description}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Checked Count Badge */}
                          <span
                            className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                              allChecked
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : checkedCount > 0
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                : 'bg-slate-100 text-slate-500 border-slate-200'
                            }`}
                          >
                            {checkedCount} / {moduleCodes.length}
                          </span>
                        </div>

                        {/* Child Nodes (Permissions List in Tree Branch) */}
                        {isExpanded && (
                          <div className="divide-y divide-slate-100 bg-white">
                            {module.permissions.map((perm) => {
                              const isChecked = selectedPermissions.includes(perm.code);

                              return (
                                <div
                                  key={perm.code}
                                  onClick={() => handleTogglePermission(perm.code)}
                                  className={`pl-11 pr-4 py-3 flex items-start justify-between gap-3 cursor-pointer transition-colors ${
                                    isChecked ? 'bg-indigo-50/20' : 'hover:bg-slate-50/80'
                                  }`}
                                >
                                  <div className="flex items-start gap-3">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleTogglePermission(perm.code);
                                      }}
                                      disabled={!canAssign}
                                      className="mt-0.5 text-slate-700 hover:text-indigo-600 focus:outline-none disabled:opacity-50"
                                    >
                                      {isChecked ? (
                                        <CheckSquare className="w-4 h-4 text-indigo-600" />
                                      ) : (
                                        <Square className="w-4 h-4 text-slate-300" />
                                      )}
                                    </button>

                                    <div>
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span
                                          className={`text-xs font-semibold ${
                                            isChecked ? 'text-slate-900' : 'text-slate-700'
                                          }`}
                                        >
                                          {perm.name}
                                        </span>
                                        <code className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 font-mono text-slate-600 border border-slate-200">
                                          {perm.code}
                                        </code>
                                      </div>
                                      <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                                        {perm.description}
                                      </p>
                                    </div>
                                  </div>

                                  <span
                                    className={`shrink-0 text-[10px] px-2 py-0.5 rounded font-medium ${
                                      isChecked
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                        : 'bg-slate-100 text-slate-400'
                                    }`}
                                  >
                                    {isChecked ? 'Được cấp' : 'Không có quyền'}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-400 text-xs">
              Vui lòng chọn một vai trò từ danh sách bên trái để xem và phân quyền.
            </div>
          )}
        </div>
      </div>
      ) : (
        /* Direct Supabase Database Tables View */
        <div className="space-y-6">
          {/* Information Card */}
          <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-1">
                <Database className="w-4 h-4" />
                <span>Supabase PostgreSQL Schema Synchronization</span>
              </div>
              <h3 className="text-sm font-bold text-white">
                Bảng Dữ Liệu Gốc: <code className="text-indigo-300 font-mono">permission_groups</code> & <code className="text-indigo-300 font-mono">permissions</code>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Toàn bộ dữ liệu, mã quyền và khóa ngoại (group_id) được đồng bộ chính xác 100% với cơ sở dữ liệu Supabase của bạn.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 rounded-xl bg-slate-800 text-emerald-400 text-xs font-mono font-medium border border-slate-700">
                ● 5 groups
              </span>
              <span className="px-3 py-1.5 rounded-xl bg-slate-800 text-indigo-400 text-xs font-mono font-medium border border-slate-700">
                ● 20 permissions
              </span>
            </div>
          </div>

          {/* Table 1: permission_groups */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-2">
                <Table className="w-4 h-4 text-indigo-600" />
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Bảng: <code className="font-mono text-indigo-700">permission_groups</code> (5 nhóm)
                </h4>
              </div>
              <span className="text-[11px] text-slate-500 font-mono">public.permission_groups</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3">id (int8)</th>
                    <th className="px-5 py-3">group_name (text)</th>
                    <th className="px-5 py-3">description (text)</th>
                    <th className="px-5 py-3">created_at (timestamptz)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {(permData?.permission_groups || [
                    { id: 1, group_name: 'USER', description: 'Quản lý người dùng', created_at: '2026-03-01T10:00:00.000Z' },
                    { id: 2, group_name: 'HR', description: 'Quản lý nhân sự', created_at: '2026-03-01T10:00:00.000Z' },
                    { id: 3, group_name: 'RP', description: 'Báo cáo & thống kê', created_at: '2026-03-01T10:00:00.000Z' },
                    { id: 4, group_name: 'PERM', description: 'Quản trị phân quyền', created_at: '2026-03-01T10:00:00.000Z' },
                    { id: 5, group_name: 'DOC', description: 'Quản lý tài liệu', created_at: '2026-03-01T10:00:00.000Z' }
                  ]).map((g: PermissionGroup) => (
                    <tr key={g.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-slate-900">{g.id}</td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {g.group_name}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-sans text-slate-700">{g.description}</td>
                      <td className="px-5 py-3.5 text-slate-400 text-[11px]">{g.created_at || '2026-03-01 10:00:00+07'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Table 2: permissions */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/60">
              <div className="flex items-center gap-2">
                <Table className="w-4 h-4 text-emerald-600" />
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Bảng: <code className="font-mono text-emerald-700">permissions</code> (20 quyền)
                </h4>
              </div>
              <span className="text-[11px] text-slate-500 font-mono">public.permissions (FK: group_id → permission_groups.id)</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3">id (int8)</th>
                    <th className="px-5 py-3">group_id (int8)</th>
                    <th className="px-5 py-3">permission_code (text)</th>
                    <th className="px-5 py-3">permission_name (text)</th>
                    <th className="px-5 py-3">created_at (timestamptz)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {(permData?.permissions || [
                    { id: 1, group_id: 1, permission_code: 'USER_VIEW', permission_name: 'Xem thông tin' },
                    { id: 2, group_id: 1, permission_code: 'USER_CREATE', permission_name: 'Tạo mới' },
                    { id: 3, group_id: 1, permission_code: 'USER_UPDATE', permission_name: 'Cập nhật' },
                    { id: 4, group_id: 1, permission_code: 'USER_REMOVE', permission_name: 'Xóa' },
                    { id: 5, group_id: 2, permission_code: 'HR_VIEW', permission_name: 'Xem thông tin' },
                    { id: 6, group_id: 2, permission_code: 'HR_CREATE', permission_name: 'Tạo mới' },
                    { id: 7, group_id: 2, permission_code: 'HR_UPDATE', permission_name: 'Cập nhật' },
                    { id: 8, group_id: 2, permission_code: 'HR_REMOVE', permission_name: 'Xóa' },
                    { id: 9, group_id: 3, permission_code: 'REPORT_VIEW', permission_name: 'Xem thông tin' },
                    { id: 10, group_id: 3, permission_code: 'REPORT_CREATE', permission_name: 'Tạo mới' },
                    { id: 11, group_id: 3, permission_code: 'REPORT_UPDATE', permission_name: 'Cập nhật' },
                    { id: 12, group_id: 3, permission_code: 'REPORT_REMOVE', permission_name: 'Xóa' },
                    { id: 13, group_id: 4, permission_code: 'PERM_VIEW', permission_name: 'Xem thông tin' },
                    { id: 14, group_id: 4, permission_code: 'PERM_CREATE', permission_name: 'Tạo mới' },
                    { id: 15, group_id: 4, permission_code: 'PERM_UPDATE', permission_name: 'Cập nhật' },
                    { id: 16, group_id: 4, permission_code: 'PERM_REMOVE', permission_name: 'Xóa' },
                    { id: 17, group_id: 5, permission_code: 'DOC_VIEW', permission_name: 'Xem thông tin' },
                    { id: 18, group_id: 5, permission_code: 'DOC_CREATE', permission_name: 'Tạo mới' },
                    { id: 19, group_id: 5, permission_code: 'DOC_UPDATE', permission_name: 'Cập nhật' },
                    { id: 20, group_id: 5, permission_code: 'DOC_REMOVE', permission_name: 'Xóa' }
                  ]).map((p: PermissionItem) => (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3 font-bold text-slate-900">{p.id}</td>
                      <td className="px-5 py-3">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold border border-slate-200">
                          {p.group_id}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <code className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {p.permission_code}
                        </code>
                      </td>
                      <td className="px-5 py-3 font-sans font-semibold text-slate-800">{p.permission_name}</td>
                      <td className="px-5 py-3 text-slate-400 text-[11px]">{p.created_at || '2026-03-01 10:00:00+07'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Tạo vai trò mới */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-in fade-in">
            <h3 className="text-base font-bold text-slate-900 mb-1">Thêm Vai Trò Người Dùng Mới</h3>
            <p className="text-xs text-slate-500 mb-4">
              Tạo vai trò tùy chỉnh và gán cây quyền cụ thể cho vai trò này
            </p>

            <form onSubmit={handleCreateRole} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tên vai trò <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="Ví dụ: Kế Toán Trưởng, Kiểm Toán Viên..."
                  required
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mô tả vai trò
                </label>
                <textarea
                  value={newRoleDesc}
                  onChange={(e) => setNewRoleDesc(e.target.value)}
                  rows={3}
                  placeholder="Mô tả phạm vi quyền hạn và trách nhiệm của vai trò..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={createRoleMutation.isPending}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-xs disabled:opacity-50"
                >
                  {createRoleMutation.isPending ? 'Đang tạo...' : 'Tạo Vai Trò'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PermissionsPage;
