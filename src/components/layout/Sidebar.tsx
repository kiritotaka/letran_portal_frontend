import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ShieldCheck,
  Users,
  UserCheck,
  BarChart3,
  FileText,
  Settings,
  History,
  Lock,
  X,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  name: string;
  path: string;
  icon: React.ElementType;
  requiredPermission?: string;
  badge?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { hasPermission, role, user, permissions } = useAuth();

  const navItems: NavItem[] = [
    {
      name: 'Bảng Điều Khiển',
      path: '/',
      icon: LayoutDashboard
    },
    {
      name: 'Phân Quyền Vai Trò',
      path: '/permissions',
      icon: ShieldCheck,
      requiredPermission: 'PERM_VIEW',
      badge: 'PERM'
    },
    {
      name: 'Quản Lý Người Dùng',
      path: '/users',
      icon: Users,
      requiredPermission: 'USER_VIEW',
      badge: 'USER'
    },
    {
      name: 'Quản Lý Nhân Sự',
      path: '/hr',
      icon: UserCheck,
      requiredPermission: 'HR_VIEW',
      badge: 'HR'
    },
    {
      name: 'Báo Cáo & Thống Kê',
      path: '/reports',
      icon: BarChart3,
      requiredPermission: 'REPORT_VIEW',
      badge: 'RP'
    },
    {
      name: 'Kho Tài Liệu',
      path: '/documents',
      icon: FileText,
      requiredPermission: 'DOC_VIEW',
      badge: 'DOC'
    },
    {
      name: 'Cài Đặt Hệ Thống',
      path: '/settings',
      icon: Settings
    },
    {
      name: 'Nhật Ký Kiểm Toán',
      path: '/audit-logs',
      icon: History
    }
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar container */}
      <aside
        id="app-sidebar"
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500 text-white flex items-center justify-center font-bold text-sm shadow-xs">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <span className="font-semibold text-white text-sm tracking-tight block">
                RBAC Security
              </span>
              <span className="text-[11px] text-slate-400">Authorization Portal</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sidebar"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <div className="px-3 pb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Menu Chức Năng
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isAllowed = !item.requiredPermission || hasPermission(item.requiredPermission);

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => {
                  if (window.innerWidth < 1024) onClose();
                }}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all group ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : isAllowed
                      ? 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      : 'text-slate-500 hover:bg-slate-800/50 cursor-pointer'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isAllowed ? 'group-hover:text-white' : 'text-slate-500'
                    }`}
                  />
                  <span className="truncate">{item.name}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {item.badge && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {item.badge}
                    </span>
                  )}
                  {!isAllowed && (
                    <span
                      title={`Yêu cầu quyền: ${item.requiredPermission}`}
                      className="text-amber-400/80 p-0.5"
                    >
                      <Lock className="w-3.5 h-3.5" />
                    </span>
                  )}
                </div>
              </NavLink>
            );
          })}
        </div>

        {/* Current user & role summary card at bottom */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/40">
          <div className="p-3 rounded-lg bg-slate-800/80 border border-slate-700/60">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-medium text-slate-400">Vai trò hiện tại:</span>
              <span className="text-[11px] font-semibold text-indigo-400 truncate max-w-[120px]">
                {role?.name || user?.roleId}
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Số quyền sở hữu:</span>
              <span className="font-semibold text-white flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                {role?.id === 'admin' ? 'Toàn bộ' : `${permissions.length} quyền`}
              </span>
            </div>

            {user?.roleId === 'admin' && (
              <div className="mt-2 text-[10px] text-emerald-400/90 bg-emerald-950/40 border border-emerald-800/40 px-2 py-1 rounded">
                🛡️ Super Admin - Toàn quyền truy cập mọi tính năng
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
