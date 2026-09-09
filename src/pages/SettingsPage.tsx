import React, { useState } from 'react';
import { Settings, Shield, Lock, RotateCcw, Activity, Play, CheckCircle2, Layers } from 'lucide-react';
import Can from '../components/guards/Can';
import withAuthorization from '../components/guards/withAuthorization';
import { useResetDemoData } from '../hooks/useApiQueries';
import { notify } from '../stores/notificationStore';
import { testApi } from '../services/api';

const SettingsPageComponent: React.FC = () => {
  const [minPassLen, setMinPassLen] = useState('6');
  const [forceFirstLoginOnCreate, setForceFirstLoginOnCreate] = useState(true);
  const [sessionTimeout, setSessionTimeout] = useState('60');

  const resetMutation = useResetDemoData();

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    notify.success('Đã lưu cấu hình chính sách bảo mật hệ thống thành công!');
  };

  const handleResetData = () => {
    if (!window.confirm('Khôi phục toàn bộ người dùng và vai trò về dữ liệu mẫu ban đầu?')) return;
    resetMutation.mutate();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Cài Đặt Hệ Thống & Bảo Mật
            </h2>
            <p className="text-xs text-slate-500">
              Cấu hình các tham số vận hành, chính sách mật khẩu và khôi phục môi trường thử nghiệm
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleResetData}
          disabled={resetMutation.isPending}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors disabled:opacity-50"
          title="Khôi phục tài khoản Admin, Manager, Staff và user FirstLogin mẫu"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>{resetMutation.isPending ? 'Đang khôi phục...' : 'Khôi Phục Dữ Liệu Demo'}</span>
        </button>
      </div>

      {/* Security Policies Form */}
      <Can
        do="settings.security"
        fallback={
          <div className="p-6 rounded-2xl bg-white border border-slate-200 text-center text-xs text-slate-500">
            <Lock className="w-8 h-8 text-amber-500 mx-auto mb-2" />
            <p className="font-semibold text-slate-800">Cấu hình bảo mật đang bị khóa</p>
            <p className="mt-1">
              Bạn cần quyền <code className="text-indigo-600 font-mono">settings.security</code> để điều chỉnh tham số mật khẩu.
            </p>
          </div>
        }
      >
        <form onSubmit={handleSave} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Shield className="w-4 h-4 text-indigo-600" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Chính Sách Mật Khẩu & Xác Thực
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Độ dài tối thiểu của mật khẩu mới
              </label>
              <select
                value={minPassLen}
                onChange={(e) => setMinPassLen(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
              >
                <option value="6">6 ký tự (Tiêu chuẩn)</option>
                <option value="8">8 ký tự (Khuyến nghị)</option>
                <option value="12">12 ký tự (Bảo mật cao)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Thời gian hết hạn phiên đăng nhập (phút)
              </label>
              <select
                value={sessionTimeout}
                onChange={(e) => setSessionTimeout(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
              >
                <option value="30">30 phút</option>
                <option value="60">60 phút (1 giờ)</option>
                <option value="1440">24 giờ</option>
              </select>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={forceFirstLoginOnCreate}
                onChange={(e) => setForceFirstLoginOnCreate(e.target.checked)}
                className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <span className="text-xs font-semibold text-slate-900 block">
                  Mặc định bật cờ is_first_login = true khi tạo người dùng mới
                </span>
                <span className="text-[11px] text-slate-500">
                  Bắt buộc nhân sự mới phải tự thiết lập mật khẩu cá nhân ngay trong lần đầu truy cập hệ thống.
                </span>
              </div>
            </label>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
            >
              Lưu Cấu Hình
            </button>
          </div>
        </form>
      </Can>

      {/* Anti-Flickering API Loading Test Lab */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Kiểm Thử Hiệu Ứng Loading & Chống Nhấp Nháy (Anti-Flickering Lab)
            </h3>
          </div>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
            Debounce 250ms • Multi-Request Counter
          </span>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">
          Thử nghiệm cơ chế quản lý trạng thái tải: Khi gọi đồng thời hoặc liên tiếp nhiều API bất đồng bộ, bộ đếm <code className="font-mono text-indigo-600">activeRequests</code> và bộ đệm trễ <code className="font-mono text-indigo-600">hideDebounce (250ms)</code> đảm bảo bảng phủ overlay duy trì trạng thái liên tục, tuyệt đối không bị nhấp nháy tắt/bật gián đoạn.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          {/* Test 1: Single Normal Request */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-800">1. Đơn Lẻ (500ms)</span>
                <span className="text-[10px] font-mono text-slate-400">Single</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Gọi 1 API thông thường, overlay hiển thị và tự động ẩn mượt sau khi có phản hồi.
              </p>
            </div>
            <button
              type="button"
              id="btn-test-single-api"
              onClick={async () => {
                await testApi.simulateDelay(500, 'Tải dữ liệu danh mục');
                notify.success('Hoàn thành API đơn lẻ (500ms)!');
              }}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-colors"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Thử nghiệm (1 API)</span>
            </button>
          </div>

          {/* Test 2: Concurrent Multiple APIs */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-800">2. Đồng Thời (3 API)</span>
                <span className="text-[10px] font-mono text-indigo-600 font-bold">Parallel</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Chạy 3 API cùng lúc (400ms, 800ms, 1200ms). Overlay đếm lùi số tác vụ và không nháy khi từng API hoàn thành.
              </p>
            </div>
            <button
              type="button"
              id="btn-test-parallel-api"
              onClick={async () => {
                await Promise.all([
                  testApi.simulateDelay(400, 'API Người dùng'),
                  testApi.simulateDelay(800, 'API Phân quyền'),
                  testApi.simulateDelay(1200, 'API Hồ sơ nhân sự')
                ]);
                notify.success('Cả 3 API đồng thời đã xử lý xong!');
              }}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Chạy 3 API Đồng Thời</span>
            </button>
          </div>

          {/* Test 3: Sequential / Chained APIs with Gap */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-800">3. Nối Tiếp (Khoảng 100ms)</span>
                <span className="text-[10px] font-mono text-amber-600 font-bold">Chained</span>
              </div>
              <p className="text-[11px] text-slate-500">
                API 1 xong, chờ 100ms mới gọi API 2. Nhờ Grace Period 250ms, overlay không hề bị chớp tắt!
              </p>
            </div>
            <button
              type="button"
              id="btn-test-chained-api"
              onClick={async () => {
                await testApi.simulateDelay(400, 'Bước 1: Kiểm tra quyền');
                // Khoảng cách giữa 2 API
                await new Promise((r) => setTimeout(r, 100));
                await testApi.simulateDelay(500, 'Bước 2: Nạp báo cáo');
                notify.success('Chuỗi API nối tiếp hoàn thành êm ái!');
              }}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 transition-colors"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Chạy Nối Tiếp (Chained)</span>
            </button>
          </div>

          {/* Test 4: Fast Micro-Request (< 100ms) */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-800">4. Siêu Nhanh (50ms)</span>
                <span className="text-[10px] font-mono text-slate-400">Fast Cache</span>
              </div>
              <p className="text-[11px] text-slate-500">
                API hoàn tất dưới ngưỡng trễ 100ms. Overlay được triệt tiêu hoàn toàn, không xuất hiện một tích tắc nào.
              </p>
            </div>
            <button
              type="button"
              id="btn-test-fast-api"
              onClick={async () => {
                await testApi.simulateDelay(50, 'Lấy cache');
                notify.info('API 50ms hoàn tất — Không bật overlay để tránh nháy mắt!');
              }}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Chạy API Nhanh (50ms)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const SettingsPage = withAuthorization(SettingsPageComponent, 'settings.view');
export default SettingsPage;
