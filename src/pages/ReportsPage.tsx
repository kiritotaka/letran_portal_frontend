import React, { useState } from 'react';
import { BarChart3, Download, Share2, Calendar, TrendingUp } from 'lucide-react';
import Can from '../components/guards/Can';
import withAuthorization from '../components/guards/withAuthorization';
import { notify } from '../stores/notificationStore';

const ReportsPageComponent: React.FC = () => {
  const [downloading, setDownloading] = useState(false);

  const handleExport = () => {
    setDownloading(true);
    setTimeout(() => {
      setDownloading(false);
      notify.success('Đã xuất báo cáo tổng hợp thống kê ra tệp Excel (BaoCao_HeThong_2025.xlsx)!');
    }, 800);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Báo Cáo & Thống Kê Hoạt Động (Nhóm RP)
            </h2>
            <p className="text-xs text-slate-500">
              Trang được bảo vệ bởi Route Guard / HOC với mã quyền{' '}
              <code className="font-mono text-emerald-600 font-semibold">REPORT_VIEW</code> (Bảng DB Group 3: RP)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Fine-grained permission button using <Can /> component */}
          <Can
            do="REPORT_CREATE"
            fallback={
              <button
                type="button"
                disabled
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-slate-100 text-slate-400 cursor-not-allowed"
                title="Bạn thiếu quyền REPORT_CREATE"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Xuất Excel (Bị Khóa)</span>
              </button>
            }
          >
            <button
              type="button"
              id="btn-export-reports"
              onClick={handleExport}
              disabled={downloading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{downloading ? 'Đang xuất...' : 'Xuất Báo Cáo Excel'}</span>
            </button>
          </Can>

          <Can do="REPORT_UPDATE">
            <button
              type="button"
              onClick={() => notify.info('Liên kết báo cáo đã được sao chép vào bộ nhớ tạm!')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Chia Sẻ</span>
            </button>
          </Can>
        </div>
      </div>

      {/* Reports Data View */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span>Tỷ Lệ Đổi Mật Khẩu Lần Đầu</span>
            <Calendar className="w-4 h-4 text-slate-400" />
          </div>
          <span className="text-2xl font-bold text-slate-900">87.5%</span>
          <p className="text-[11px] text-emerald-600 mt-1 flex items-center gap-1 font-medium">
            <TrendingUp className="w-3 h-3" />
            Đạt tiêu chuẩn an toàn thông tin
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span>Phiên Đăng Nhập Hoạt Động</span>
            <Calendar className="w-4 h-4 text-slate-400" />
          </div>
          <span className="text-2xl font-bold text-slate-900">24</span>
          <p className="text-[11px] text-slate-500 mt-1">Đồng bộ đa thiết bị qua API</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span>Số Lần Chặn 403 (Guard)</span>
            <Calendar className="w-4 h-4 text-slate-400" />
          </div>
          <span className="text-2xl font-bold text-slate-900">12</span>
          <p className="text-[11px] text-indigo-600 mt-1 font-medium">
            Route Guard ngăn chặn truy cập trái phép
          </p>
        </div>
      </div>
    </div>
  );
};

// Protect this page with the Higher-Order Component withAuthorization!
export const ReportsPage = withAuthorization(ReportsPageComponent, 'REPORT_VIEW');
export default ReportsPage;
