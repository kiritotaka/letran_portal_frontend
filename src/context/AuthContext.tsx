import React, {
  createContext,
  useContext,
  useEffect,
  useCallback,
} from "react";
import { User, Role } from "../types";
import { authApi } from "../services/api";
import { refreshSession } from "../services/sessionClient";
import { useAuthStore, PendingFirstLoginUser } from "../stores/authStore";
import { queryClient } from "../lib/queryClient";
interface Context {
  user: User | null;
  role: Role | null;
  permissions: string[];
  token: string | null;
  isLoading: boolean;
  pendingFirstLoginUser: PendingFirstLoginUser | null;
  login: (
    email: string,
    password: string,
  ) => Promise<{
    success: boolean;
    is_first_login?: boolean;
    message?: string;
  }>;
  changePasswordFirstLogin: (
    email: string,
    currentPassword: string,
    newPassword: string,
  ) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  hasPermission: (code: string) => boolean;
  hasAnyPermission: (codes: string[]) => boolean;
  hasAllPermissions: (codes: string[]) => boolean;
  refreshUserData: () => Promise<void>;
  setPendingFirstLoginUser: (pending: PendingFirstLoginUser | null) => void;
}
const AuthContext = createContext<Context | undefined>(undefined);
const message = (e: any) =>
  e.response?.data?.error?.message || e.message || "Không thể kết nối máy chủ.";
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const state = useAuthStore();
  useEffect(() => {
    let mounted = true;
    if (useAuthStore.getState().refreshToken) {
      refreshSession()
        .catch(() => {})
        .finally(() => {
          if (mounted) useAuthStore.getState().setLoading(false);
        });
    } else state.setLoading(false);
    return () => {
      mounted = false;
    };
  }, []);
  useEffect(() => {
    if (state.isLoading || !state.refreshToken || !state.expiresAt) return;
    const timer = window.setTimeout(
      () => {
        refreshSession().catch(() => {});
      },
      Math.min(
        2147483647,
        Math.max(1000, state.expiresAt * 1000 - Date.now() - 60000),
      ),
    );
    return () => window.clearTimeout(timer);
  }, [state.refreshToken, state.expiresAt, state.isLoading]);
  useEffect(
    () =>
      useAuthStore.subscribe((next, prev) => {
        if (
          next.user?.id !== prev.user?.id ||
          next.permissions !== prev.permissions
        )
          queryClient.clear();
      }),
    [],
  );
  const login = async (email: string, password: string) => {
    state.clearSession();
    const revision = useAuthStore.getState().revision;
    state.setLoading(true);
    try {
      const response = await authApi.login(email, password);
      if (useAuthStore.getState().revision !== revision)
        throw new Error("Yêu cầu đăng nhập đã hủy.");
      if (!response.success) throw new Error("Đăng nhập thất bại.");
      state.saveSession(response.data);
      return {
        success: true,
        is_first_login: response.data.user.is_first_login,
      };
    } catch (e) {
      return { success: false, message: message(e) };
    } finally {
      state.setLoading(false);
    }
  };
  const changePasswordFirstLogin = async (
    email: string,
    currentPassword: string,
    newPassword: string,
  ) => {
    const revision = useAuthStore.getState().revision;
    state.setLoading(true);
    try {
      const response = await authApi.changePasswordFirstLogin(
        email,
        currentPassword,
        newPassword,
      );
      if (!response.success || !response.data.password_changed)
        throw new Error("Chưa xác nhận được kết quả đổi mật khẩu.");
      if (useAuthStore.getState().revision !== revision)
        return {
          success: false,
          message: "Mật khẩu đã đổi. Hãy đăng nhập lại bằng mật khẩu mới.",
        };
      const result = await login(email, newPassword);
      if (!result.success || result.is_first_login)
        return {
          success: false,
          message: "Mật khẩu đã đổi. Hãy đăng nhập lại bằng mật khẩu mới.",
        };
      return { success: true };
    } catch (e: any) {
      const code = e.response?.data?.error?.code;
      if (code === "PASSWORD_CHANGED_PROFILE_SYNC_FAILED")
        return {
          success: false,
          message:
            "Mật khẩu đã đổi nhưng profile chưa đồng bộ. Dùng mật khẩu mới để đăng nhập và liên hệ quản trị viên.",
        };
      if (code === "PASSWORD_CHANGE_STATUS_UNKNOWN")
        return {
          success: false,
          message:
            "Chưa xác nhận được kết quả. Thử đăng nhập bằng mật khẩu mới trước khi đổi lại.",
        };
      return { success: false, message: message(e) };
    } finally {
      state.setLoading(false);
    }
  };
  const refreshUserData = useCallback(async () => {
    if (useAuthStore.getState().refreshToken) await refreshSession();
  }, []);
  const logout = () => {
    state.clearSession();
    queryClient.clear();
  };
  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        changePasswordFirstLogin,
        refreshUserData,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
export const useAuth = () => {
  const c = useContext(AuthContext);
  if (!c) throw new Error("AuthProvider required");
  return c;
};
export default AuthContext;
