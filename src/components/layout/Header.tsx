import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Menu,
  Shield,
  Bell,
  LogOut,
  KeyRound,
  UserCheck,
  ChevronDown,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface HeaderProps {
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const { user, role, logout, login } = useAuth();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showQuickSwitch, setShowQuickSwitch] = useState(false);
  const [switching, setSwitching] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleQuickSwitch = async (email: string, pass: string) => {
    setSwitching(true);
    setShowQuickSwitch(false);
    setShowUserMenu(false);
    const res = await login(email, pass);
    setSwitching(false);
    if (res.is_first_login) {
      navigate('/change-password-first-login');
    } else if (res.success) {
      navigate('/');
    }
  };

  const roleColors: Record<string, string> = {
    admin: 'bg-rose-50 text-rose-700 border-rose-200',
    manager: 'bg-blue-50 text-blue-700 border-blue-200',
    staff: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    viewer: 'bg-slate-100 text-slate-700 border-slate-200'
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-200 px-4 lg:px-6 py-3">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Hamburger & Brand Title */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            id="btn-toggle-sidebar"
            onClick={onToggleSidebar}
            aria-label="Toggle navigation menu"
            className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-slate-900 tracking-tight leading-tight hidden sm:block">
                Hệ Thống Phân Quyền & Xác Thực
              </h1>
              <span className="text-xs text-slate-500 font-medium hidden sm:block">
                RBAC Security Architecture
              </span>
            </div>
          </div>
        </div>

        {/* Right: Quick Switcher & User Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Account Switcher for easy testing */}
          <div className="relative">
            <button
              type="button"
              id="btn-quick-switch-account"
              onClick={() => setShowQuickSwitch(!showQuickSwitch)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors"
              title="Đổi nhanh tài khoản để kiểm tra phân quyền"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden md:inline">Đổi tài khoản test</span>
              <ChevronDown className="w-3 h-3 opacity-70" />
            </button>

            {showQuickSwitch && (
              <div
                className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-1"
                onMouseLeave={() => setShowQuickSwitch(false)}
              >
                <div className="px-3 py-1.5 border-b border-slate-100 mb-1">
                  <p className="text-xs font-semibold text-slate-900">Chuyển đổi tài khoản mẫu</p>
                  <p className="text-[11px] text-slate-500">Bấm để kiểm tra giao diện phân quyền tương ứng</p>
                </div>

                <button
                  type="button"
                  onClick={() => handleQuickSwitch('admin@system.com', 'Admin@123')}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between text-xs transition-colors"
                >
                  <div>
                    <span className="font-semibold text-slate-900 block">👑 Admin (Toàn quyền)</span>
                    <span className="text-slate-500 text-[11px]">admin@system.com</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 font-medium">
                    Super
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickSwitch('user.firstlogin@system.com', 'Temp@12345')}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between text-xs transition-colors"
                >
                  <div>
                    <span className="font-semibold text-amber-900 block">⚡ User Đăng nhập lần đầu</span>
                    <span className="text-slate-500 text-[11px]">user.firstlogin@system.com</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 font-medium">
                    First Login
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickSwitch('manager@system.com', 'Manager@123')}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between text-xs transition-colors"
                >
                  <div>
                    <span className="font-semibold text-slate-900 block">👔 Trưởng phòng (Manager)</span>
                    <span className="text-slate-500 text-[11px]">manager@system.com</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-medium">
                    Manager
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickSwitch('staff@system.com', 'Staff@123')}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between text-xs transition-colors"
                >
                  <div>
                    <span className="font-semibold text-slate-900 block">💼 Nhân viên (Staff)</span>
                    <span className="text-slate-500 text-[11px]">staff@system.com</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                    Staff
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Notifications button */}
          <button
            type="button"
            id="btn-header-notifications"
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors relative"
            title="Thông báo"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-indigo-600 rounded-full ring-2 ring-white" />
          </button>

          {/* User Profile dropdown */}
          <div className="relative">
            <button
              type="button"
              id="btn-user-profile-menu"
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden ring-1 ring-slate-300 flex items-center justify-center">
                {user?.avatar ? (
                  <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs font-semibold text-slate-600">
                    {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </span>
                )}
              </div>
              <div className="text-left hidden lg:block">
                <span className="text-xs font-semibold text-slate-900 block leading-tight truncate max-w-[120px]">
                  {user?.name || 'Người dùng'}
                </span>
                <span
                  className={`inline-block text-[10px] px-1.5 py-0.2 rounded border font-medium ${
                    roleColors[role?.id || 'viewer'] || 'bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  {role?.name || user?.roleId || 'Thành viên'}
                </span>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400 hidden sm:block" />
            </button>

            {showUserMenu && (
              <div
                className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-50 animate-in fade-in"
                onMouseLeave={() => setShowUserMenu(false)}
              >
                <div className="px-4 py-2.5 border-b border-slate-100">
                  <p className="text-sm font-semibold text-slate-900 truncate">{user?.name}</p>
                  <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                  <div className="mt-2 flex items-center gap-1.5">
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${
                        roleColors[role?.id || 'viewer'] || 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      Vai trò: {role?.name || user?.roleId}
                    </span>
                  </div>
                </div>

                <div className="py-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowUserMenu(false);
                      navigate('/change-password-first-login');
                    }}
                    className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                  >
                    <KeyRound className="w-4 h-4 text-slate-400" />
                    Đổi mật khẩu tài khoản
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowUserMenu(false);
                      navigate('/users');
                    }}
                    className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                  >
                    <UserCheck className="w-4 h-4 text-slate-400" />
                    Hồ sơ & Danh sách người dùng
                  </button>
                </div>

                <div className="border-t border-slate-100 pt-1">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 font-medium transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Đăng xuất khỏi hệ thống
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
