import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  KeyRound,
  Lock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldAlert,
  Eye,
  EyeOff,
  Sparkles,
  Loader2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const FirstLoginChangePasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { pendingFirstLoginUser, changePasswordFirstLogin, user } = useAuth();

  const stateData = (location.state as { email?: string; currentPassword?: string }) || {};
  const defaultEmail = stateData.email || pendingFirstLoginUser?.email || user?.email || 'user.firstlogin@system.com';
  const defaultCurrentPass = stateData.currentPassword || (defaultEmail === 'user.firstlogin@system.com' ? 'Temp@12345' : '');

  const [email] = useState(defaultEmail);
  const [currentPassword, setCurrentPassword] = useState(defaultCurrentPass);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  const [statusStep, setStatusStep] = useState<number>(0); // 0: idle, 1: updating password & is_first_login=false, 2: auto logging in, 3: success
  const [error, setError] = useState<string | null>(null);

  // Password validation checks
  const hasMinLength = newPassword.length >= 6;
  const hasNumber = /\d/.test(newPassword);
  const hasLetter = /[a-zA-Z]/.test(newPassword);
  const isMatch = newPassword === confirmPassword && newPassword.length > 0;
  const isDifferentFromOld = newPassword !== currentPassword;
  const isValid = hasMinLength && hasNumber && hasLetter && isMatch && isDifferentFromOld;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!currentPassword) {
      setError('Vui lòng nhập mật khẩu hiện tại.');
      return;
    }

    if (!isValid) {
      if (newPassword === currentPassword) {
        setError('Mật khẩu mới không được trùng với mật khẩu hiện tại.');
      } else if (!isMatch) {
        setError('Mật khẩu xác nhận không khớp.');
      } else {
        setError('Mật khẩu mới phải đáp ứng đầy đủ các tiêu chuẩn bảo mật.');
      }
      return;
    }

    try {
      // Step 1 & 2 combined in context method with clear visual progress:
      // "đổi mật khẩu xong sẽ call api cập nhật is_first_login = false rồi call api login luôn"
      setStatusStep(1); // Call API cập nhật mật khẩu & is_first_login = false

      await new Promise((r) => setTimeout(r, 400)); // slight pause for clear step feedback

      setStatusStep(2); // Call API login luôn
      const res = await changePasswordFirstLogin(email, currentPassword, newPassword);

      if (!res.success) {
        setStatusStep(0);
        setError(res.message || 'Thao tác đổi mật khẩu và đăng nhập tự động thất bại.');
        return;
      }

      setStatusStep(3); // Success
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 800);
    } catch (err: unknown) {
      setStatusStep(0);
      const msg = err instanceof Error ? err.message : 'Có lỗi không xác định xảy ra';
      setError(msg);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center bg-slate-900 px-4 py-10 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-80 bg-radial from-amber-900/30 via-transparent to-transparent pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/20">
            <KeyRound className="w-8 h-8" />
          </div>
        </div>

        <h2 className="mt-4 text-center text-2xl font-bold tracking-tight text-white">
          Đổi Mật Khẩu Lần Đầu
        </h2>
        <p className="mt-1 text-center text-xs text-amber-300 font-medium">
          Trạng thái tài khoản: <code className="px-1.5 py-0.5 rounded bg-amber-950/60 border border-amber-800/80">is_first_login = true</code>
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white py-7 px-6 shadow-xl rounded-2xl sm:px-9 border border-slate-200">
          {/* Security Alert Notice */}
          <div className="mb-5 p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-900 text-xs">
            <div className="flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold mb-0.5">Yêu cầu bảo mật lần đầu truy cập</p>
                <p className="text-[11px] text-amber-700 leading-relaxed">
                  Để bảo vệ an toàn cho hệ thống, bạn cần đặt lại mật khẩu mới. Sau khi hoàn tất, hệ thống sẽ tự động cập nhật <span className="font-mono font-semibold">is_first_login = false</span> và tự động đăng nhập ngay lập tức.
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Workflow Step Feedback */}
          {statusStep > 0 && (
            <div className="mb-5 p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs space-y-2">
              <div className="flex items-center gap-2">
                {statusStep === 1 ? (
                  <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                )}
                <span className={statusStep >= 1 ? 'font-semibold text-slate-800' : 'text-slate-500'}>
                  1. Gọi API cập nhật mật khẩu mới & đặt <code className="text-[10px]">is_first_login = false</code>
                </span>
              </div>

              <div className="flex items-center gap-2">
                {statusStep === 2 ? (
                  <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                ) : statusStep === 3 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-slate-300" />
                )}
                <span className={statusStep >= 2 ? 'font-semibold text-slate-800' : 'text-slate-500'}>
                  2. Tự động gọi API đăng nhập xác thực
                </span>
              </div>

              <div className="flex items-center gap-2">
                {statusStep === 3 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-slate-300" />
                )}
                <span className={statusStep === 3 ? 'font-semibold text-emerald-700' : 'text-slate-500'}>
                  3. Đăng nhập thành công! Đang vào hệ thống...
                </span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tài khoản Email
              </label>
              <input
                type="text"
                value={email}
                disabled
                className="block w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 text-xs font-medium cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mật khẩu hiện tại (khởi tạo)
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Nhập mật khẩu hiện tại"
                  required
                  className="block w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs focus:ring-2 focus:ring-amber-500 focus:bg-white"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Mật khẩu mới
                </label>
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1"
                >
                  {showPass ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  <span>{showPass ? 'Ẩn' : 'Hiện'}</span>
                </button>
              </div>
              <input
                type={showPass ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nhập mật khẩu mới"
                required
                className="block w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs focus:ring-2 focus:ring-amber-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Xác nhận mật khẩu mới
              </label>
              <input
                type={showPass ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu mới"
                required
                className="block w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs focus:ring-2 focus:ring-amber-500 focus:bg-white"
              />
            </div>

            {/* Checklist requirements */}
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] space-y-1 text-slate-600">
              <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-emerald-700' : 'text-slate-400'}`}>
                <CheckCircle2 className={`w-3.5 h-3.5 ${hasMinLength ? 'text-emerald-600' : 'text-slate-300'}`} />
                <span>Ít nhất 6 ký tự</span>
              </div>
              <div className={`flex items-center gap-1.5 ${hasNumber && hasLetter ? 'text-emerald-700' : 'text-slate-400'}`}>
                <CheckCircle2 className={`w-3.5 h-3.5 ${hasNumber && hasLetter ? 'text-emerald-600' : 'text-slate-300'}`} />
                <span>Chứa cả chữ cái và chữ số</span>
              </div>
              <div className={`flex items-center gap-1.5 ${isMatch ? 'text-emerald-700' : 'text-slate-400'}`}>
                <CheckCircle2 className={`w-3.5 h-3.5 ${isMatch ? 'text-emerald-600' : 'text-slate-300'}`} />
                <span>Mật khẩu xác nhận khớp nhau</span>
              </div>
            </div>

            <button
              type="submit"
              id="btn-submit-change-password-first-login"
              disabled={statusStep > 0}
              className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-white bg-amber-600 hover:bg-amber-700 font-medium text-xs shadow-xs transition-all disabled:opacity-50"
            >
              {statusStep > 0 ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang xử lý quy trình đăng nhập...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Lưu Mật Khẩu & Đăng Nhập Ngay</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick filler button for instant test */}
          <div className="mt-4 pt-3 border-t border-slate-100 text-center">
            <button
              type="button"
              id="btn-quick-fill-new-pass"
              onClick={() => {
                setNewPassword('SecurePass@2025');
                setConfirmPassword('SecurePass@2025');
              }}
              className="text-[11px] text-amber-700 hover:underline font-medium"
            >
              ⚡ Tự động điền mật khẩu mẫu hợp lệ: "SecurePass@2025"
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FirstLoginChangePasswordPage;
