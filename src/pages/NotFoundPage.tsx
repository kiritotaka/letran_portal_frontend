import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Home } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-200">
          <AlertTriangle className="w-7 h-7" />
        </div>

        <h2 className="text-xl font-bold text-slate-900 mb-1">
          404 - Không Tìm Thấy Trang
        </h2>
        <p className="text-xs text-slate-500 mb-6">
          Đường dẫn bạn yêu cầu không tồn tại hoặc đã bị di dời.
        </p>

        <button
          type="button"
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-xs"
        >
          <Home className="w-4 h-4" />
          <span>Về Bảng Điều Khiển</span>
        </button>
      </div>
    </div>
  );
};

export default NotFoundPage;
