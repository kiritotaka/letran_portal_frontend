import React, { useState, useEffect } from 'react';
import { History, Search, RefreshCw, Loader2 } from 'lucide-react';
import withAuthorization from '../components/guards/withAuthorization';
import { useAuditLogs } from '../hooks/useApiQueries';
import { useDebounce } from '../hooks/useDebounce';
import Pagination from '../components/common/Pagination';

const AuditLogsPageComponent: React.FC = () => {
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 350);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Khi tìm kiếm, quay về trang 1
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const {
    data: auditResult,
    isLoading,
    isFetching,
    refetch
  } = useAuditLogs({
    page,
    limit,
    search: debouncedSearch
  });

  const logs = auditResult?.logs || [];
  const pagination = auditResult?.pagination || {
    page: 1,
    limit: 10,
    total: logs.length,
    totalPages: 1
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 border border-violet-100 flex items-center justify-center">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Nhật Ký Kiểm Toán (Audit Logs)
            </h2>
            <p className="text-xs text-slate-500">
              Ghi nhận các sự kiện: đăng nhập, đổi mật khẩu lần đầu (is_first_login), và phân quyền vai trò
            </p>
          </div>
        </div>

        <button
          type="button"
          id="btn-refresh-audit-logs"
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          <span>Làm Mới</span>
        </button>
      </div>

      {/* Filter & Server Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="input-server-search-audit"
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Tìm kiếm máy chủ theo hành động, người thực hiện hoặc chi tiết..."
            className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
          />
          {isFetching && (
            <Loader2 className="w-3.5 h-3.5 text-indigo-500 animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
          )}
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="py-12 text-center text-xs text-slate-500">Đang tải nhật ký từ máy chủ...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5">Hành Động</th>
                  <th className="px-5 py-3.5">Nội Dung Chi Tiết</th>
                  <th className="px-5 py-3.5">Người Thực Hiện</th>
                  <th className="px-5 py-3.5">Địa Chỉ IP</th>
                  <th className="px-5 py-3.5">Thời Gian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-slate-400">
                      Không tìm thấy bản ghi nhật ký nào trên máy chủ.
                    </td>
                  </tr>
                ) : (
                  logs.map((log: any) => (
                    <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3.5">
                        <span className="font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-800 text-[11px] border border-slate-200">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-900 font-medium max-w-md">
                        {log.detail}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 font-mono text-[11px]">
                        {log.performedBy}
                      </td>
                      <td className="px-5 py-3.5 text-slate-400 font-mono text-[11px]">
                        {log.ip || '127.0.0.1'}
                      </td>
                      <td className="px-5 py-3.5 text-slate-400 font-mono text-[11px]">
                        {new Date(log.timestamp).toLocaleString('vi-VN')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Server Pagination */}
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
          itemName="nhật ký"
          isLoading={isFetching}
        />
      </div>
    </div>
  );
};

export const AuditLogsPage = withAuthorization(AuditLogsPageComponent, 'settings.audit');
export default AuditLogsPage;
