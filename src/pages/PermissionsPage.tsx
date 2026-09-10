import React, { useState } from 'react';
import { ShieldCheck, RefreshCw, Search } from 'lucide-react';
import { usePermissions } from '../hooks/useApiQueries';

export default function PermissionsPage() {
  const { data, isPending, isError, isFetching, refetch } = usePermissions();
  const [search, setSearch] = useState('');
  const query = search.trim().toLocaleLowerCase('vi-VN');
  const modules = (data?.modules ?? []).map((group) => {
    const groupMatches = `${group.name} ${group.description}`.toLocaleLowerCase('vi-VN').includes(query);
    return { ...group, permissions: group.permissions.filter((p) => groupMatches ||
      `${p.name} ${p.code}`.toLocaleLowerCase('vi-VN').includes(query)) };
  }).filter((group) => group.permissions.length > 0);

  return <div className="space-y-6">
    <header className="flex items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><ShieldCheck className="w-5 h-5" /></div>
        <div>
          <h1 className="text-lg font-bold text-slate-900">Danh Sách Quyền</h1>
          <p className="text-sm text-slate-500">Xem quyền truy cập theo nhóm chức năng. Gán quyền tại trang chi tiết người dùng.</p>
        </div>
      </div>
      <button type="button" onClick={() => refetch()} disabled={isFetching} aria-label="Tải lại danh sách quyền"
        className="p-2 bg-slate-100 rounded-xl text-slate-600 hover:bg-slate-200 disabled:opacity-50">
        <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
      </button>
    </header>
    <div className="relative">
      <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
      <input value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Tìm quyền"
        placeholder="Tìm theo tên nhóm, tên quyền hoặc mã quyền..."
        className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500" />
    </div>
    {isPending ? <p role="status" className="text-sm text-slate-500">Đang tải danh sách quyền...</p>
      : isError ? <p role="alert" className="text-sm text-red-600">Không thể tải danh sách quyền. <button type="button" onClick={() => refetch()} className="underline">Thử lại</button></p>
      : <>
        <p className="text-sm text-slate-500">{data?.totalCount ?? 0} quyền trong {data?.modules.length ?? 0} nhóm</p>
        {modules.length === 0 && <p className="text-sm text-slate-500">Không có quyền phù hợp.</p>}
        {modules.map((group) => <section key={group.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200">
            <h2 className="font-semibold text-slate-900">{group.name}</h2>
            <p className="text-sm text-slate-500">{group.description}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead><tr className="text-slate-500"><th scope="col" className="p-4">Tên quyền</th><th scope="col" className="p-4">Mã quyền</th></tr></thead>
              <tbody className="divide-y divide-slate-100">{group.permissions.map((p) => <tr key={p.id}>
                <td className="p-4 text-slate-700">{p.name}</td><td className="p-4 font-mono text-indigo-700">{p.code}</td>
              </tr>)}</tbody>
            </table>
          </div>
        </section>)}
      </>}
  </div>;
}
