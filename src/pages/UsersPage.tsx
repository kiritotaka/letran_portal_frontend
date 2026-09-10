import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users as UsersIcon,
  UserPlus,
  CheckCircle2,
  RefreshCw,
  Search,
  Loader2,
  Eye,
  UserX,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import Can from "../components/guards/Can";
import {
  useUsers,
  useDeactivateUser,
} from "../hooks/useApiQueries";
import { useDebounce } from "../hooks/useDebounce";
import Pagination from "../components/common/Pagination";

export const UsersPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const navigate = useNavigate();

  // State tìm kiếm và phân trang phía Server
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 350);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(5);

  // Khi thay đổi tìm kiếm, tự động reset về trang 1
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  // React Query hooks for centralized state and caching
  const {
    data: usersResult,
    isLoading: loadingUsers,
    isFetching: fetchingUsers,
    refetch: refetchUsers,
  } = useUsers({
    page,
    limit,
    search: debouncedSearch,
  });

  const users = usersResult?.users || [];
  const pagination = usersResult?.pagination || {
    page: 1,
    limit: 5,
    total: users.length,
    totalPages: 1,
  };


  const deactivateUser = useDeactivateUser();
  const canUpdate = hasPermission('USER_UPDATE');

  const handleRefresh = () => {
    refetchUsers();
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
                Theo dõi tài khoản, trạng thái đăng nhập lần đầu và quyền truy
                cập
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
              onClick={() => navigate("/users/new")}
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
            placeholder="Tìm kiếm người dùng theo email..."
            className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
          />
          {fetchingUsers && (
            <Loader2 className="w-3.5 h-3.5 text-indigo-500 animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
          )}
        </div>


      </div>

      {deactivateUser.isError && <p role="alert" className="text-sm text-red-600">Không thể vô hiệu hóa người dùng. {deactivateUser.error.message}</p>}
      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loadingUsers ? (
          <div className="py-16 text-center text-xs text-slate-500">
            Đang tải dữ liệu...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50/80 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5">Người Dùng</th>
                  <th className="px-5 py-3.5">Quyền truy cập</th>
                  <th className="px-5 py-3.5">Loại tài khoản</th>
                  <th className="px-5 py-3.5">Trạng Thái Đổi MK</th>
                  <th className="px-5 py-3.5 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-10 text-center text-slate-400"
                    >
                      Không tìm thấy người dùng phù hợp trên máy chủ.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => {
                    return (
                      <tr
                        key={u.id}
                        className="hover:bg-slate-50/70 transition-colors"
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden ring-1 ring-slate-200 shrink-0">
                              <span className="flex items-center justify-center h-full font-bold text-slate-600">
                                {u.email.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <span className="font-semibold text-slate-900 block">
                                {u.email}
                              </span>
                              {u.is_active === false && <span className="text-xs text-red-600">Đã vô hiệu hóa</span>}
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-3.5 font-medium text-slate-700 truncate max-w-[200px]">
                          {u.permissions.length > 0
                            ? u.permissions.join(", ")
                            : "Chưa có quyền"}
                        </td>

                        <td className="px-5 py-3.5">
                          <span className="font-semibold text-slate-800">
                            {u.is_super_admin ? "Super Admin" : "Người dùng"}
                          </span>
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
                            <button type="button" onClick={() => navigate(`/users/${encodeURIComponent(u.id)}`, { state: { user: u } })}
                              aria-label={`Xem chi tiết ${u.email}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200">
                              <Eye className="w-3 h-3" /> Chi tiết
                            </button>
                            {canUpdate && <button type="button" disabled={deactivateUser.isPending || u.is_active === false}
                              aria-label={`Vô hiệu hóa ${u.email}`}
                              onClick={() => {
                                if (window.confirm(`Vô hiệu hóa tài khoản ${u.email}?`)) deactivateUser.mutate(u.id);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 disabled:opacity-50">
                              <UserX className="w-3 h-3" /> Vô hiệu hóa
                            </button>}
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
          page={page}
          limit={limit}
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


    </div>
  );
};

export default UsersPage;
