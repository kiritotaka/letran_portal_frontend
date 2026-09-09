import React, { useState, useEffect } from 'react';
import {
  Users as UsersIcon,
  UserPlus,
  KeyRound,
  CheckCircle2,
  RefreshCw,
  Search,
  Filter,
  Loader2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Can from '../components/guards/Can';
import {
  useUsers,
  useRoles,
  useCreateUser,
  useUpdateUser,
  useResetFirstLogin
} from '../hooks/useApiQueries';
import { useDebounce } from '../hooks/useDebounce';
import Pagination from '../components/common/Pagination';

export const UsersPage: React.FC = () => {
  const { user: currentUser, hasPermission } = useAuth();

  // State tìm kiếm và phân trang phía Server
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 350);
  const [roleFilter, setRoleFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(5);

  // Khi thay đổi bộ lọc tìm kiếm hoặc vai trò, tự động reset về trang 1
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, roleFilter]);

  // React Query hooks for centralized state and caching
  const {
    data: usersResult,
    isLoading: loadingUsers,
    isFetching: fetchingUsers,
    refetch: refetchUsers
  } = useUsers({
    page,
    limit,
    search: debouncedSearch,
    roleId: roleFilter
  });

  const users = usersResult?.users || [];
  const pagination = usersResult?.pagination || {
    page: 1,
    limit: 5,
    total: users.length,
    totalPages: 1
  };

  const { data: roles = [], refetch: refetchRoles } = useRoles();

  const createUserMutation = useCreateUser();
  const updateUserMutation = useUpdateUser();
  const resetFirstLoginMutation = useResetFirstLogin();

  // Add user modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRoleId, setNewRoleId] = useState('staff');
  const [newDept, setNewDept] = useState('Phòng Kỹ thuật');
  const [newIsFirstLogin, setNewIsFirstLogin] = useState(true);
  const [newPassword, setNewPassword] = useState('Temp@12345');

  const canEdit = hasPermission('USER_UPDATE') || currentUser?.roleId === 'admin';
  const canResetPass = hasPermission('USER_UPDATE') || currentUser?.roleId === 'admin';

  const handleRefresh = () => {
    refetchUsers();
    refetchRoles();
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    createUserMutation.mutate(
      {
        name: newName,
        email: newEmail,
        roleId: newRoleId,
        department: newDept,
        is_first_login: newIsFirstLogin,
        password: newPassword
      },
      {
        onSuccess: () => {
          setShowAddModal(false);
          setNewName('');
          setNewEmail('');
        }
      }
    );
  };

  const handleRoleChange = (userId: string, newRole: string) => {
    updateUserMutation.mutate({
      id: userId,
      data: { roleId: newRole }
    });
  };

  const handleResetFirstLogin = (userId: string, email: string) => {
    if (
      !window.confirm(
        `Bạn muốn bật cờ is_first_login = true cho ${email}? Mật khẩu sẽ được đặt lại về "Temp@12345".`
      )
    ) {
      return;
    }

    resetFirstLoginMutation.mutate(userId);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center">
              <UsersIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                Quản Lý Người Dùng & Trạng Thái
              </h2>
              <p className="text-xs text-slate-500">
                Theo dõi tài khoản, cờ đăng nhập lần đầu (is_first_login) và phân bổ vai trò
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleRefresh}
            className="p-2 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            title="Tải lại danh sách"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <Can do="USER_CREATE">
            <button
              type="button"
              id="btn-add-new-user"
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              <span>Thêm Người Dùng</span>
            </button>
          </Can>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="input-server-search-users"
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Tìm kiếm máy chủ theo tên, email hoặc phòng ban..."
            className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
          />
          {fetchingUsers && (
            <Loader2 className="w-3.5 h-3.5 text-indigo-500 animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            id="select-user-role-filter"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">Tất cả vai trò</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loadingUsers ? (
          <div className="py-16 text-center text-xs text-slate-500">Đang tải dữ liệu...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50/80 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5">Người Dùng</th>
                  <th className="px-5 py-3.5">Phòng Ban</th>
                  <th className="px-5 py-3.5">Vai Trò (Role)</th>
                  <th className="px-5 py-3.5">Trạng Thái Đổi MK</th>
                  <th className="px-5 py-3.5 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-slate-400">
                      Không tìm thấy người dùng phù hợp trên máy chủ.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => {
                    const roleObj = roles.find((r) => r.id === u.roleId);

                    return (
                      <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden ring-1 ring-slate-200 shrink-0">
                              {u.avatar ? (
                                <img
                                  src={u.avatar}
                                  alt={u.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className="flex items-center justify-center h-full font-bold text-slate-600">
                                  {u.name.charAt(0)}
                                </span>
                              )}
                            </div>
                            <div>
                              <span className="font-semibold text-slate-900 block">{u.name}</span>
                              <span className="text-[11px] text-slate-400 font-mono">{u.email}</span>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-3.5 font-medium text-slate-700">
                          {u.department || 'Chưa phân bổ'}
                        </td>

                        <td className="px-5 py-3.5">
                          {canEdit ? (
                            <select
                              value={u.roleId}
                              onChange={(e) => handleRoleChange(u.id, e.target.value)}
                              disabled={updateUserMutation.isPending}
                              className="text-xs font-semibold px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                            >
                              {roles.map((r) => (
                                <option key={r.id} value={r.id}>
                                  {r.name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="font-semibold text-slate-800">
                              {roleObj?.name || u.roleId}
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-3.5">
                          {u.is_first_login ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                              Chưa đổi MK (Lần đầu)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Đã đổi MK an toàn
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Reset First Login Flag button */}
                            {canResetPass && (
                              <button
                                type="button"
                                onClick={() => handleResetFirstLogin(u.id, u.email)}
                                disabled={resetFirstLoginMutation.isPending}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors disabled:opacity-50"
                                title="Bật cờ yêu cầu đổi mật khẩu lần đầu (is_first_login = true)"
                              >
                                <KeyRound className="w-3 h-3" />
                                <span>Reset First Login</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Phân trang máy chủ (Server Pagination) */}
        <Pagination
          page={pagination.page}
          limit={pagination.limit}
          total={pagination.total}
          totalPages={pagination.totalPages}
          onPageChange={(newPage) => setPage(newPage)}
          onLimitChange={(newLimit) => {
            setLimit(newLimit);
            setPage(1);
          }}
          itemName="người dùng"
          isLoading={fetchingUsers}
        />
      </div>

      {/* Modal: Thêm người dùng mới */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-in fade-in">
            <h3 className="text-base font-bold text-slate-900 mb-1">Thêm Người Dùng Mới</h3>
            <p className="text-xs text-slate-500 mb-4">
              Cấp tài khoản và thiết lập cờ bắt buộc đổi mật khẩu lần đầu
            </p>

            <form onSubmit={handleCreateUser} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Họ và tên
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ví dụ: Hoàng Minh Long"
                  required
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Địa chỉ Email
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="hoanglong@system.com"
                  required
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Vai trò (Role)
                  </label>
                  <select
                    value={newRoleId}
                    onChange={(e) => setNewRoleId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Phòng ban
                  </label>
                  <input
                    type="text"
                    value={newDept}
                    onChange={(e) => setNewDept(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mật khẩu khởi tạo
                </label>
                <input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white font-mono"
                />
              </div>

              {/* is_first_login check */}
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newIsFirstLogin}
                    onChange={(e) => setNewIsFirstLogin(e.target.checked)}
                    className="mt-0.5 rounded text-amber-600 focus:ring-amber-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-amber-900 block">
                      Bắt buộc đổi mật khẩu khi đăng nhập lần đầu (is_first_login = true)
                    </span>
                    <span className="text-[11px] text-amber-700">
                      Người dùng sẽ được chuyển ngay sang trang đổi mật khẩu khi vừa đăng nhập.
                    </span>
                  </div>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={createUserMutation.isPending}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-xs disabled:opacity-50"
                >
                  {createUserMutation.isPending ? 'Đang lưu...' : 'Lưu Người Dùng'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;
