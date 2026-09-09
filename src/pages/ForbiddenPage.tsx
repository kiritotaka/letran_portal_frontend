import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Home, UserCheck, KeyRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface ForbiddenPageProps {
  missingPermission?: string;
}

export const ForbiddenPage: React.FC<ForbiddenPageProps> = ({ missingPermission }) => {
  const navigate = useNavigate();
  const { user, role } = useAuth();

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
        <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-200 shadow-inner">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <span className="inline-block text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-rose-50 text-rose-700 border border-rose-200 mb-2">
          403 - Quyền Truy Cập Bị Từ Chối
        </span>

        <h2 className="text-xl font-bold text-slate-900 mb-2">
          Bạn Chưa Được Cấp Quyền Này
        </h2>

        <p className="text-xs text-slate-500 mb-6 leading-relaxed">
          Tài khoản của bạn hiện thuộc vai trò{' '}
          <strong className="text-slate-800 font-semibold">{role?.name || user?.roleId}</strong>{' '}
          và không có thẩm quyền truy cập tài nguyên hoặc chức năng này.
        </p>

        {missingPermission && (
          <div className="mb-6 p-3 bg-slate-50 rounded-xl border border-slate-200 text-left">
            <span className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
              Quyền hạn yêu cầu (Required Permission):
            </span>
            <code className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 block truncate">
              {missingPermission}
            </code>
            <p className="text-[11px] text-slate-400 mt-1.5">
              Vui lòng liên hệ Quản trị viên hệ thống (Admin) để được mở thêm quyền trong ma trận phân quyền.
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2.5 justify-center">
          <button
            type="button"
            id="btn-back-dashboard"
            onClick={() => navigate('/')}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-xs"
          >
            <Home className="w-4 h-4" />
            <span>Về Bảng Điều Khiển</span>
          </button>

          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại trang trước</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ForbiddenPage;
