import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Users,
  UserCheck,
  KeyRound,
  Lock,
  Unlock,
  BarChart3,
  FileText,
  Settings,
  ArrowRight,
  Sparkles,
  History
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePermissions, useUsers, useAuditLogs } from '../hooks/useApiQueries';
import { PermissionModule } from '../types';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, role, permissions, hasPermission } = useAuth();

  const canViewPermissions = hasPermission('PERM_VIEW');
  const canViewUsers = hasPermission('USER_VIEW');
  const canViewAudit = hasPermission('settings.audit');
  const { data: permData } = usePermissions({ enabled: canViewPermissions });
  const { data: usersData } = useUsers(undefined, { enabled: canViewUsers });
  const { data: auditData } = useAuditLogs({ limit: 5 }, { enabled: canViewAudit });

  const modules: PermissionModule[] = permData?.modules || [];
  const totalUsers = usersData?.pagination?.total ?? (usersData?.users?.length ?? 0);
  const recentLogs = auditData?.logs?.slice(0, 5) || [];

  const totalPermissionsCount = canViewPermissions && permData ? permData.totalCount : undefined;
  const userPermCount = role?.id === 'admin' ? (totalPermissionsCount ?? 'Toàn bộ') : permissions.length;

  const quickFeatures = [
    {
      title: 'Danh Sách Quyền',
      description: 'Xem các quyền truy cập theo nhóm chức năng',
      path: '/permissions',
      perm: 'PERM_VIEW',
      icon: ShieldCheck,
      color: 'indigo'
    },
    {
      title: 'Quản Lý Người Dùng',
      description: 'Xem thông tin tài khoản và cập nhật quyền truy cập',
      path: '/users',
      perm: 'USER_VIEW',
      icon: Users,
      color: 'blue'
    },
    {
      title: 'Quản Lý Nhân Sự (HR)',
      description: 'Hồ sơ nhân viên, hợp đồng lao động và chế độ phúc lợi',
      path: '/hr',
      perm: 'HR_VIEW',
      icon: UserCheck,
      color: 'teal'
    },
    {
      title: 'Báo Cáo & Thống Kê',
      description: 'Dữ liệu phân tích hoạt động và xuất tệp tin Excel/PDF',
      path: '/reports',
      perm: 'REPORT_VIEW',
      icon: BarChart3,
      color: 'emerald'
    },
    {
      title: 'Kho Lưu Trữ Tài Liệu',
      description: 'Quản lý văn bản, hồ sơ dự án và tài liệu mật',
      path: '/documents',
      perm: 'DOC_VIEW',
      icon: FileText,
      color: 'amber'
    },
    {
      title: 'Cài Đặt Hệ Thống',
      description: 'Cấu hình tham số máy chủ và chính sách bảo mật',
      path: '/settings',
      perm: 'settings.view',
      icon: Settings,
      color: 'slate'
    },
    {
      title: 'Nhật Ký Kiểm Toán (Audit)',
      description: 'Tra cứu lịch sử đăng nhập, đổi mật khẩu và sửa quyền',
      path: '/audit-logs',
      perm: 'settings.audit',
      icon: History,
      color: 'violet'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Mô Hình RBAC (Role-Based Access Control) & Guard Protection</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
            Xin chào, {user?.name || 'Quản trị viên'}!
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm mt-1.5 leading-relaxed">
            Bạn đang đăng nhập với vai trò{' '}
            <span className="font-bold text-white px-2 py-0.5 rounded bg-indigo-600/60 border border-indigo-400/40">
              {role?.name || user?.roleId}
            </span>
            . Bạn đang nắm giữ{' '}
            <strong className="text-emerald-400 font-semibold">{userPermCount}</strong>
            {totalPermissionsCount !== undefined && <> / {totalPermissionsCount}</>} quyền trong hệ thống.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            {hasPermission('PERM_VIEW') && <button
              type="button"
              id="btn-dash-go-permissions"
              onClick={() => navigate('/permissions')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
            >
              <span>Xem Cây Phân Quyền Chi Tiết</span>
              <ArrowRight className="w-4 h-4" />
            </button>}
            {hasPermission('USER_VIEW') && <button
              type="button"
              onClick={() => navigate('/users')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/15 text-white rounded-xl text-xs font-medium border border-white/10 transition-colors"
            >
              <span>Quản Lý Người Dùng & First Login</span>
            </button>}
          </div>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {canViewUsers && <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Người Dùng Đã Cấp</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{totalUsers}</span>
            <span className="text-[11px] text-slate-400">tài khoản</span>
          </div>
          <span className="text-[11px] text-emerald-600 font-medium mt-1 block">
            Hỗ trợ cờ is_first_login
          </span>
        </div>}

        {canViewPermissions && <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Nhóm Quyền</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{modules.length}</span>
            <span className="text-[11px] text-slate-400">nhóm quyền</span>
          </div>
          <span className="text-[11px] text-indigo-600 font-medium mt-1 block">
            Phân nhóm theo chức năng
          </span>
        </div>}

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Quyền Của Bạn</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <KeyRound className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-600">{userPermCount}</span>
            <span className="text-[11px] text-slate-400">{totalPermissionsCount !== undefined ? `/ ${totalPermissionsCount} quyền` : 'quyền'}</span>
          </div>
          <span className="text-[11px] text-slate-500 font-medium mt-1 block">
            {role?.id === 'admin' ? 'Toàn bộ quyền hạn' : 'Được giới hạn theo vai trò'}
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Bảo Vệ Guard & HOC</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">100%</span>
            <span className="text-[11px] text-slate-400">Route an toàn</span>
          </div>
          <span className="text-[11px] text-emerald-600 font-medium mt-1 block">
            Chặn truy cập 403 nếu thiếu quyền
          </span>
        </div>
      </div>

      {/* Feature Access Matrix Cards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Các Chức Năng Hệ Thống (Trạng Thái Theo Quyền Của Bạn)
          </h3>
          <span className="text-[11px] text-slate-400">Bấm để kiểm tra bảo vệ Route Guard</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickFeatures.filter((feat) => !feat.perm || hasPermission(feat.perm)).map((feat) => {
            const Icon = feat.icon;
            const isAllowed = !feat.perm || hasPermission(feat.perm);

            return (
              <div
                key={feat.path}
                onClick={() => navigate(feat.path)}
                className={`p-5 rounded-2xl border transition-all cursor-pointer bg-white relative group ${
                  isAllowed
                    ? 'border-slate-200 hover:border-indigo-300 hover:shadow-md'
                    : 'border-slate-200/80 bg-slate-50/70 hover:border-amber-300'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                    <Icon className="w-5 h-5" />
                  </div>

                  {isAllowed ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <Unlock className="w-3 h-3 text-emerald-600" />
                      Cho phép truy cập
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                      <Lock className="w-3 h-3 text-amber-600" />
                      Bị khóa (Route Guard)
                    </span>
                  )}
                </div>

                <h4 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                  {feat.title}
                </h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {feat.description}
                </p>

                {feat.perm && (
                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Yêu cầu quyền:</span>
                    <code className="font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                      {feat.perm}
                    </code>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Audit Logs Summary */}
      {canViewAudit && <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-slate-500" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Nhật Ký Hoạt Động Gần Nhất (Audit Trail)
            </h3>
          </div>
          {hasPermission('settings.audit') && <button
            type="button"
            onClick={() => navigate('/audit-logs')}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
          >
            Xem tất cả nhật ký →
          </button>}
        </div>

        <div className="divide-y divide-slate-100">
          {recentLogs.length === 0 ? (
            <p className="py-4 text-center text-xs text-slate-400">Chưa có nhật ký hoạt động nào.</p>
          ) : (
            recentLogs.map((log: any) => (
              <div key={log.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                  <div>
                    <span className="font-semibold text-slate-900">{log.action}</span>
                    <span className="text-slate-500 ml-2">{log.detail}</span>
                  </div>
                </div>
                <span className="text-[11px] text-slate-400 shrink-0 font-mono">
                  {new Date(log.timestamp).toLocaleTimeString('vi-VN')}
                </span>
              </div>
            ))
          )}
        </div>
      </div>}
    </div>
  );
};

export default DashboardPage;
