import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, UserPlus, ShieldCheck } from 'lucide-react';
import { useCreateUser, usePermissions } from '../hooks/useApiQueries';
import PermissionMatrix from '../components/users/PermissionMatrix';

const inputClass = 'w-full mt-1 px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500';

export default function CreateUserPage() {
  const navigate = useNavigate();
  const { data: permissionData, isPending: loadingPermissions, isError: permissionsError, refetch: refetchPermissions } = usePermissions();
  const createUser = useCreateUser();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [permissions, setPermissions] = useState<number[]>([]);
  const modules = permissionData?.modules ?? [];
  const cannotSubmit = createUser.isPending || loadingPermissions || permissionsError;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (cannotSubmit) return;
    createUser.mutate({
      email: email.trim(),
      password,
      permission_ids: permissions,
      is_super_admin: isSuperAdmin,
    }, { onSuccess: () => navigate('/users') });
  };

  return (
    <div className="space-y-6">
      <button type="button" onClick={() => navigate('/users')} disabled={createUser.isPending}
        className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-indigo-600 disabled:opacity-50">
        <ArrowLeft className="h-4 w-4" /> Danh sách người dùng
      </button>
      <header className="flex items-center gap-3 bg-white p-5 rounded-2xl border border-slate-200">
        <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600"><UserPlus className="h-5 w-5" /></div>
        <div>
          <h1 className="text-lg font-bold text-slate-900">Thêm Người Dùng Mới</h1>
          <p className="text-sm text-slate-500 mt-1">Nhập thông tin tài khoản và chọn quyền truy cập.</p>
        </div>
      </header>
      <form onSubmit={submit} className="space-y-6">
        <fieldset disabled={createUser.isPending} className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
          <legend className="sr-only">Thông tin tài khoản</legend>
          <h2 className="font-semibold text-slate-900">Thông tin tài khoản</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="text-sm font-medium text-slate-700">Địa chỉ Email
              <input type="email" required autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="user@company.com" className={inputClass} />
            </label>
            <label className="text-sm font-medium text-slate-700">Mật khẩu khởi tạo
              <input type="password" required autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />
            </label>
          </div>
          <label className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl text-sm text-amber-900 cursor-pointer">
            <input type="checkbox" checked={isSuperAdmin} onChange={(e) => setIsSuperAdmin(e.target.checked)} className="h-4 w-4 accent-indigo-600" />
            Super Admin (quản trị toàn hệ thống)
          </label>
        </fieldset>

        <section className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4" aria-labelledby="permission-matrix-title">
          <h2 id="permission-matrix-title" className="font-semibold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-indigo-600" /> Ma trận phân quyền
          </h2>
          {loadingPermissions ? <p role="status" className="py-8 text-center text-sm text-slate-500">Đang tải danh sách quyền...</p>
            : permissionsError ? <div role="alert" className="p-4 bg-red-50 text-red-700 rounded-xl text-sm">
              Không thể tải đầy đủ danh sách quyền. <button type="button" onClick={() => refetchPermissions()} className="font-semibold underline">Thử lại</button>
            </div>
            : modules.length === 0 ? <p className="py-8 text-center text-sm text-slate-500">Chưa có quyền nào trong hệ thống.</p>
            : <PermissionMatrix modules={modules} selected={permissions} onChange={setPermissions} disabled={createUser.isPending} />}
        </section>

        {createUser.isError && <p role="alert" className="text-sm text-red-600">Không thể tạo người dùng. {createUser.error.message}</p>}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate('/users')} disabled={createUser.isPending}
            className="px-4 py-2 text-sm text-slate-600 bg-white border border-slate-200 rounded-xl disabled:opacity-50">Hủy bỏ</button>
          <button type="submit" disabled={cannotSubmit}
            className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl disabled:opacity-50">
            {createUser.isPending ? 'Đang lưu...' : 'Lưu Người Dùng'}
          </button>
        </div>
      </form>
    </div>
  );
}
