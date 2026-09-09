import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Shield, Lock, Mail, ArrowRight, AlertCircle, KeyRound, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading } = useAuth();

  const [email, setEmail] = useState('admin@system.com');
  const [password, setPassword] = useState('Admin@123');
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);

    if (!email || !password) {
      setError('Vui lòng nhập đầy đủ Email và Mật khẩu.');
      return;
    }

    try {
      const res = await login(email, password);

      if (!res.success) {
        setError(res.message || 'Email hoặc mật khẩu không chính xác.');
        return;
      }

      // REQUIREMENT: Nếu user trả về là is_first_login thì chuyển sang màn hình đổi mật khẩu
      if (res.is_first_login) {
        setInfoMessage('Tài khoản lần đầu đăng nhập. Đang chuyển đến màn hình đổi mật khẩu...');
        setTimeout(() => {
          navigate('/change-password-first-login', { state: { email, currentPassword: password } });
        }, 500);
        return;
      }

      // Đăng nhập bình thường
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Có lỗi xảy ra khi kết nối máy chủ';
      setError(msg);
    }
  };

  const setPreset = (presetEmail: string, presetPass: string) => {
    setEmail(presetEmail);
    setPassword(presetPass);
    setError(null);
    setInfoMessage(null);
  };

  return (
    <div className="min-h-screen flex flex-col justify-center bg-slate-900 px-4 py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background visual accents */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-radial from-indigo-900/40 via-transparent to-transparent pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30">
            <Shield className="w-8 h-8" />
          </div>
        </div>

        <h2 className="mt-4 text-center text-2xl font-bold tracking-tight text-white">
          Hệ Thống Xác Thực & Phân Quyền
        </h2>
        <p className="mt-1 text-center text-sm text-slate-400">
          Đăng nhập an toàn với mô hình phân quyền RBAC & Guard
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white py-8 px-6 shadow-xl rounded-2xl sm:px-10 border border-slate-200/80">
          {/* Active Backend Connection Indicator */}
          <div className="mb-5 p-2.5 rounded-xl bg-slate-50 border border-slate-200/90 text-[11px] flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-slate-600 truncate">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="font-mono truncate" title="https://letran-backend.onrender.com/api/v1/auth/login">
                BE: letran-backend.onrender.com
              </span>
            </div>
            <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-semibold border border-indigo-100 shrink-0 text-[10px]">
              Live API
            </span>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {infoMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2.5">
              <KeyRound className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>{infoMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="input-email" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Địa chỉ Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="input-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@system.com"
                  required
                  className="block w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="input-password" className="block text-xs font-semibold text-slate-700">
                  Mật khẩu
                </label>
                <span className="text-[11px] text-slate-400">Tối thiểu 6 ký tự</span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="input-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="block w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              id="btn-login-submit"
              disabled={isLoading}
              className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 font-medium text-sm transition-all shadow-xs disabled:opacity-50"
            >
              {isLoading ? (
                <span>Đang xử lý...</span>
              ) : (
                <>
                  <span>Đăng Nhập</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials Box */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2.5">
              Tài khoản mẫu để kiểm tra nhanh:
            </p>
            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                id="btn-preset-admin"
                onClick={() => setPreset('admin@system.com', 'Admin@123')}
                className={`w-full text-left p-2.5 rounded-xl border text-xs transition-all flex items-center justify-between ${
                  email === 'admin@system.com'
                    ? 'border-indigo-500 bg-indigo-50/50'
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                }`}
              >
                <div>
                  <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                    <span>👑 Admin mặc định (Super)</span>
                    {email === 'admin@system.com' && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />}
                  </div>
                  <div className="text-[11px] text-slate-500">admin@system.com • Admin@123</div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 font-medium">
                  Toàn quyền
                </span>
              </button>

              <button
                type="button"
                id="btn-preset-firstlogin"
                onClick={() => setPreset('user.firstlogin@system.com', 'Temp@12345')}
                className={`w-full text-left p-2.5 rounded-xl border text-xs transition-all flex items-center justify-between ${
                  email === 'user.firstlogin@system.com'
                    ? 'border-amber-500 bg-amber-50/50'
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                }`}
              >
                <div>
                  <div className="font-semibold text-amber-900 flex items-center gap-1.5">
                    <span>⚡ User đổi mật khẩu lần đầu</span>
                    {email === 'user.firstlogin@system.com' && <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />}
                  </div>
                  <div className="text-[11px] text-slate-500">user.firstlogin@system.com • Temp@12345</div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 font-medium">
                  is_first_login = true
                </span>
              </button>

              <button
                type="button"
                id="btn-preset-manager"
                onClick={() => setPreset('manager@system.com', 'Manager@123')}
                className={`w-full text-left p-2.5 rounded-xl border text-xs transition-all flex items-center justify-between ${
                  email === 'manager@system.com'
                    ? 'border-blue-500 bg-blue-50/50'
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                }`}
              >
                <div>
                  <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                    <span>👔 Trưởng phòng (Manager)</span>
                    {email === 'manager@system.com' && <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />}
                  </div>
                  <div className="text-[11px] text-slate-500">manager@system.com • Manager@123</div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-medium">
                  Quản lý
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
