import React, { useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, UserRound, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePermissions, useUpdateUser } from '../hooks/useApiQueries';
import PermissionMatrix from '../components/users/PermissionMatrix';
import type { UserListItem, UpdateUserInput } from '../types';

const inputClass = 'w-full mt-1 px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:text-slate-500';

function UserDetailForm({ selectedUser }: { selectedUser: UserListItem }) {
  const [user, setUser] = useState(selectedUser);
  const navigate = useNavigate();
  const location = useLocation();
  const { hasPermission } = useAuth();
  const canUpdate = hasPermission('USER_UPDATE');
  const permissionsQuery = usePermissions();
  const update = useUpdateUser();
  const [draft, setDraft] = useState<Partial<UpdateUserInput>>({});
  const modules = permissionsQuery.data?.modules ?? [];
  const catalog = modules.flatMap((group) => group.permissions);
  const missing = user.permissions.filter((code) => !catalog.some((p) => p.code === code));
  const selected = draft.permission_ids ?? catalog.filter((p) => user.permissions.includes(p.code)).map((p) => p.id);
  const email = draft.email ?? user.email;
  const isSuperAdmin = draft.is_super_admin ?? user.is_super_admin;
  const isActive = draft.is_active ?? user.is_active;
  const cannotSave = !canUpdate || update.isPending || permissionsQuery.isPending || permissionsQuery.isError || missing.length > 0 || isActive === undefined;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (cannotSave || isActive === undefined) return;
    update.mutate({ id: user.id, data: {
      email: email.trim(), permission_ids: selected, is_super_admin: isSuperAdmin, is_active: isActive,
    } }, { onSuccess: (updatedUser) => {
      setUser(updatedUser);
      setDraft({});
      navigate(location.pathname, { replace: true, state: { user: updatedUser } });
    } });
  };

  return <form onSubmit={submit} className="space-y-6">
    {!canUpdate && <p className="text-sm text-slate-500">Bạn đang xem thông tin người dùng. Cần quyền USER_UPDATE để chỉnh sửa.</p>}
    <fieldset disabled={!canUpdate || update.isPending} className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
      <legend className="sr-only">Thông tin tài khoản</legend>
      <h2 className="font-semibold text-slate-900">Thông tin tài khoản</h2>
      <label className="block text-sm font-medium text-slate-700">Địa chỉ Email
        <input type="email" required value={email} onChange={(e) => setDraft((prev) => ({ ...prev, email: e.target.value }))} className={inputClass} />
      </label>
      <label className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl text-sm text-amber-900">
        <input type="checkbox" checked={isSuperAdmin} onChange={(e) => setDraft((prev) => ({ ...prev, is_super_admin: e.target.checked }))} className="h-4 w-4 accent-indigo-600" />
        Super Admin (quản trị toàn hệ thống)
      </label>
      <label className="block text-sm font-medium text-slate-700">Trạng thái tài khoản
        <select required value={isActive === undefined ? '' : String(isActive)}
          onChange={(e) => setDraft((prev) => ({ ...prev, is_active: e.target.value === 'true' }))} className={inputClass}>
          <option value="" disabled>Chưa có thông tin</option>
          <option value="true">Đang hoạt động</option>
          <option value="false">Đã vô hiệu hóa</option>
        </select>
      </label>
      {isActive === undefined && canUpdate && <p className="text-sm text-amber-700">Danh sách chưa cung cấp trạng thái hoạt động. Vui lòng chọn trạng thái trước khi lưu.</p>}
    </fieldset>
    <section className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4" aria-labelledby="detail-permissions-title">
      <h2 id="detail-permissions-title" className="font-semibold text-slate-900 flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-indigo-600" /> Ma trận phân quyền</h2>
      {permissionsQuery.isPending ? <p role="status" className="text-sm text-slate-500">Đang tải danh sách quyền...</p>
        : permissionsQuery.isError ? <div role="alert" className="text-sm text-red-600">
          Không thể tải danh sách quyền. <button type="button" onClick={() => permissionsQuery.refetch()} className="underline">Thử lại</button>
          <p className="mt-2 text-slate-600">Quyền hiện tại: {user.permissions.join(', ') || 'Chưa có quyền'}</p>
        </div>
        : <>
          {modules.length ? <PermissionMatrix modules={modules} selected={selected}
            onChange={(ids) => setDraft((prev) => ({ ...prev, permission_ids: ids }))} disabled={!canUpdate || update.isPending} />
            : <p className="text-sm text-slate-500">Chưa có quyền nào trong hệ thống.</p>}
          {missing.length > 0 && <p role="alert" className="text-sm text-amber-700">Không tìm thấy ID cho quyền hiện tại: {missing.join(', ')}. Chưa thể lưu để tránh mất quyền đang có.</p>}
        </>}
    </section>
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white p-5 rounded-2xl border border-slate-200 text-sm">
      <div><dt className="text-slate-500">Ngày tạo</dt><dd>{new Date(user.created_at).toLocaleString('vi-VN')}</dd></div>
      <div><dt className="text-slate-500">Cập nhật lần cuối</dt><dd>{new Date(user.updated_at).toLocaleString('vi-VN')}</dd></div>
      <div><dt className="text-slate-500">Đăng nhập lần đầu</dt><dd>{user.is_first_login ? 'Chưa đổi mật khẩu' : 'Đã đổi mật khẩu'}</dd></div>
    </dl>
    {update.isError && <p role="alert" className="text-sm text-red-600">Không thể cập nhật người dùng. {update.error.message}</p>}
    {canUpdate && <div className="flex justify-end gap-3">
      <button type="button" disabled={update.isPending} onClick={() => { setDraft({}); update.reset(); }} className="px-4 py-2 text-sm text-slate-600 bg-white border border-slate-200 rounded-xl disabled:opacity-50">Hủy thay đổi</button>
      <button type="submit" disabled={cannotSave} className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl disabled:opacity-50">{update.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}</button>
    </div>}
  </form>;
}

export default function UserDetailPage() {
  const { userId = '' } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const selectedUser = (location.state as { user?: UserListItem } | null)?.user;
  return <div className="space-y-6">
    <button type="button" onClick={() => navigate('/users')} className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-indigo-600"><ArrowLeft className="h-4 w-4" /> Danh sách người dùng</button>
    <header className="flex items-center gap-3 bg-white p-5 rounded-2xl border border-slate-200">
      <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600"><UserRound className="h-5 w-5" /></div>
      <div><h1 className="text-lg font-bold text-slate-900">Chi tiết người dùng</h1><p className="text-sm text-slate-500 mt-1">Thông tin tài khoản và quyền truy cập.</p></div>
    </header>
    {selectedUser?.id === userId
      ? <UserDetailForm key={selectedUser.id} selectedUser={selectedUser} />
      : <p role="status" className="text-sm text-slate-600">Chưa có thông tin người dùng được chọn. Vui lòng quay lại danh sách và chọn người dùng để xem chi tiết.</p>}
  </div>;
}
