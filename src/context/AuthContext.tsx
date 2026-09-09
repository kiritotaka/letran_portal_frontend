import React, { createContext, useContext, useEffect, useCallback } from 'react';
import { User, Role } from '../types';
import { authApi } from '../services/api';
import { useAuthStore, PendingFirstLoginUser } from '../stores/authStore';
import { notify } from '../stores/notificationStore';

interface AuthContextType {
  user: User | null;
  role: Role | null;
  permissions: string[];
  token: string | null;
  isLoading: boolean;
  pendingFirstLoginUser: PendingFirstLoginUser | null;
  login: (email: string, password: string) => Promise<{ success: boolean; is_first_login?: boolean; message?: string }>;
  changePasswordFirstLogin: (
    email: string,
    currentPassword: string,
    newPassword: string
  ) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  hasPermission: (code: string) => boolean;
  hasAnyPermission: (codes: string[]) => boolean;
  hasAllPermissions: (codes: string[]) => boolean;
  refreshUserData: () => Promise<void>;
  setPendingFirstLoginUser: (u: PendingFirstLoginUser | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    user,
    role,
    permissions,
    token,
    isLoading,
    pendingFirstLoginUser,
    saveSession,
    clearSession,
    setPendingFirstLoginUser,
    setLoading,
    setUser,
    setRole,
    setPermissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions
  } = useAuthStore();

  // Fetch current user from server on boot
  const refreshUserData = useCallback(async () => {
    if (!token && !localStorage.getItem('auth_token')) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.getMe();
      const payload = (res as any).data || res;
      if (payload && payload.user) {
        setUser(payload.user);
        setRole(payload.role);
        setPermissions(payload.permissions || payload.role?.permissions || []);
      }
    } catch {
      // Keep cached data
    } finally {
      setLoading(false);
    }
  }, [token, setLoading, setUser, setRole, setPermissions]);

  useEffect(() => {
    refreshUserData();
  }, [refreshUserData]);

  // LOGIN FUNCTION
  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const res: any = await authApi.login(email, password);
      // Hỗ trợ cả cấu trúc từ BE thật: { success: true, data: { access_token, user: { id, email, is_super_admin, is_first_login, permissions } } }
      // lẫn mock response nội bộ
      const responseData = res?.data || res;

      // 1. Trích xuất token linh hoạt: access_token từ BE thật hoặc token từ mock
      const token =
        responseData?.access_token ||
        responseData?.token ||
        responseData?.accessToken ||
        res?.token ||
        res?.access_token;

      // 2. Trích xuất thông tin user từ response
      const rawUser = responseData?.user || res?.user;

      // 3. Trích xuất cờ is_first_login (từ user hoặc cấp data)
      const isFirstLogin = Boolean(rawUser?.is_first_login ?? responseData?.is_first_login ?? res?.is_first_login);

      if (!token && !isFirstLogin) {
        const errorMsg =
          res?.error?.message ||
          responseData?.error?.message ||
          res?.message ||
          responseData?.message ||
          'Đăng nhập thất bại';
        return { success: false, message: errorMsg };
      }

      // REQUIREMENT: Nếu user trả về là is_first_login thì chuyển sang màn hình đổi mật khẩu
      if (isFirstLogin) {
        const pending = {
          email: rawUser?.email || email,
          name: rawUser?.name || email
        };
        setPendingFirstLoginUser(pending);
        clearSession();

        return {
          success: true,
          is_first_login: true,
          message:
            res?.message ||
            responseData?.message ||
            'Tài khoản đăng nhập lần đầu, vui lòng đổi mật khẩu.'
        };
      }

      // Normal login success: save token and full profile
      if (token && rawUser) {
        const isSuperAdmin = Boolean(rawUser.is_super_admin || rawUser.roleId === 'admin');
        const userPermissions: string[] =
          rawUser.permissions ||
          responseData.permissions ||
          responseData.role?.permissions ||
          [];

        const userObj: User = {
          id: String(rawUser.id || 'usr_' + Date.now()),
          email: rawUser.email || email,
          name: rawUser.name || (rawUser.email ? rawUser.email.split('@')[0] : 'Người dùng'),
          roleId: rawUser.roleId || (isSuperAdmin ? 'admin' : 'staff'),
          is_first_login: false,
          avatar: rawUser.avatar,
          department: rawUser.department || (isSuperAdmin ? 'Ban Quản Trị' : 'Phòng Vận Hành'),
          status: rawUser.status || 'active',
          createdAt: rawUser.createdAt || new Date().toISOString()
        };

        const roleObj: Role = responseData.role || {
          id: isSuperAdmin ? 'admin' : (rawUser.roleId || 'staff'),
          name: isSuperAdmin ? 'Quản Trị Viên (Super Admin)' : 'Nhân Viên Hệ Thống',
          description: isSuperAdmin ? 'Toàn quyền quản trị hệ thống' : 'Người dùng được phân quyền',
          permissions: isSuperAdmin ? ['*'] : userPermissions,
          isSystem: isSuperAdmin,
          badgeColor: isSuperAdmin ? 'indigo' : 'teal'
        };

        saveSession(token, userObj, roleObj, isSuperAdmin ? ['*'] : userPermissions);
        notify.success(`Chào mừng ${userObj.name} trở lại hệ thống!`, 'Đăng nhập thành công');
        return { success: true, is_first_login: false };
      }

      return { success: false, message: 'Dữ liệu xác thực không hợp lệ' };
    } catch (err: any) {
      // Global error interceptor already notifies, return message for form
      const msg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        (typeof err.response?.data?.error === 'string' ? err.response?.data?.error : undefined) ||
        err.message ||
        'Lỗi kết nối máy chủ';
      return { success: false, message: msg };
    } finally {
      setLoading(false);
    }
  };

  // CHANGE PASSWORD FIRST LOGIN & AUTO LOGIN
  const changePasswordFirstLogin = async (
    email: string,
    currentPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; message?: string }> => {
    setLoading(true);
    try {
      // Bước 1: Call API cập nhật mật khẩu và đặt is_first_login = false
      const changeRes: any = await authApi.changePasswordFirstLogin(email, currentPassword, newPassword);
      const changeData = changeRes.data || changeRes;

      if (!changeRes.success && changeData.success === false) {
        return {
          success: false,
          message: changeData.message || 'Cập nhật mật khẩu thất bại'
        };
      }

      notify.success('Cập nhật mật khẩu mới thành công. Đang tự động đăng nhập...', 'Đổi mật khẩu');

      // Bước 2: Call API login luôn với mật khẩu mới vừa đổi!
      const loginRes: any = await authApi.login(email, newPassword);
      const loginData = loginRes.data || loginRes;

      if (!loginRes.success && !loginData.token) {
        return {
          success: false,
          message: loginData.message || 'Không thể tự động đăng nhập sau khi đổi mật khẩu'
        };
      }

      // Bước 3: Lưu session và hoàn tất
      if (loginData.token && loginData.user && loginData.role) {
        saveSession(
          loginData.token,
          loginData.user,
          loginData.role,
          loginData.permissions || loginData.role.permissions || []
        );
        notify.success(`Đã tự động đăng nhập thành công với tài khoản ${loginData.user.name}!`, 'Hoàn tất');
        return {
          success: true,
          message: 'Đổi mật khẩu thành công và tự động đăng nhập thành công!'
        };
      }

      return { success: false, message: 'Lỗi đồng bộ dữ liệu phiên làm việc' };
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Lỗi thực hiện đổi mật khẩu';
      return { success: false, message: msg };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    clearSession();
    notify.info('Đã đăng xuất khỏi hệ thống an toàn.', 'Đăng xuất');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        permissions,
        token,
        isLoading,
        pendingFirstLoginUser,
        login,
        changePasswordFirstLogin,
        logout,
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
        refreshUserData,
        setPendingFirstLoginUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
