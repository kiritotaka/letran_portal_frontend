import { create } from "zustand";
import { User, Role } from "../types";
import type { SessionData } from "../services/sessionTypes";
export interface PendingFirstLoginUser {
  email: string;
  name: string;
}
const KEY = "letran_session_v1";
let saved: SessionData | null = null;
try {
  for (const key of [
    "auth_token",
    "auth_user",
    "auth_role",
    "auth_permissions",
  ])
    localStorage.removeItem(key);
  saved = JSON.parse(sessionStorage.getItem(KEY) || "null");
  if (!saved?.refresh_token || !saved?.user?.id) saved = null;
} catch {
  saved = null;
}
interface AuthState {
  user: User | null;
  role: Role | null;
  permissions: string[];
  token: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  revision: number;
  isLoading: boolean;
  pendingFirstLoginUser: PendingFirstLoginUser | null;
  saveSession: (data: SessionData) => void;
  clearSession: () => void;
  setPendingFirstLoginUser: (p: PendingFirstLoginUser | null) => void;
  setLoading: (loading: boolean) => void;
  hasPermission: (code: string) => boolean;
  hasAnyPermission: (codes: string[]) => boolean;
  hasAllPermissions: (codes: string[]) => boolean;
}
export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  role: null,
  permissions: [],
  token: saved?.access_token || null,
  refreshToken: saved?.refresh_token || null,
  expiresAt: saved?.expires_at || null,
  revision: 0,
  isLoading: !!saved,
  pendingFirstLoginUser: null,
  saveSession: (data) => {
    if (
      !data.access_token ||
      !data.refresh_token ||
      !data.user?.id ||
      !Array.isArray(data.user.permissions) ||
      !Number.isFinite(data.expires_in)
    )
      throw new Error("Phiên không hợp lệ.");
    const expiresAt =
      data.expires_at ?? Math.floor(Date.now() / 1000) + data.expires_in;
    try {
      sessionStorage.setItem(
        KEY,
        JSON.stringify({ ...data, expires_at: expiresAt }),
      );
    } catch {
      /* memory fallback */
    }
    const raw = data.user,
      admin = raw.is_super_admin === true;
    const permissions = admin ? ["*"] : raw.permissions;
    const role: Role = {
      id: admin ? "admin" : "staff",
      name: admin ? "Quản trị viên" : "Người dùng",
      description: "",
      permissions,
    };
    const user: User = {
      id: raw.id,
      email: raw.email,
      name: raw.email.split("@")[0],
      roleId: role.id,
      is_first_login: raw.is_first_login,
      status: "active",
      createdAt: "",
    };
    set((s) => ({
      token: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt,
      user,
      role,
      permissions,
      revision: s.revision + 1,
      pendingFirstLoginUser: raw.is_first_login
        ? { email: raw.email, name: raw.email }
        : null,
    }));
  },
  clearSession: () => {
    try {
      sessionStorage.removeItem(KEY);
      sessionStorage.removeItem("pending_first_login");
    } catch {
      /* storage disabled */
    }
    set((s) => ({
      token: null,
      refreshToken: null,
      expiresAt: null,
      user: null,
      role: null,
      permissions: [],
      pendingFirstLoginUser: null,
      revision: s.revision + 1,
    }));
  },
  setPendingFirstLoginUser: (pendingFirstLoginUser) =>
    set({ pendingFirstLoginUser }),
  setLoading: (isLoading) => set({ isLoading }),
  hasPermission: (code) =>
    !!get().user &&
    !get().user.is_first_login &&
    (get().role?.id === "admin" || get().permissions.includes(code)),
  hasAnyPermission: (codes) => codes.some((code) => get().hasPermission(code)),
  hasAllPermissions: (codes) =>
    !!get().user &&
    !get().user.is_first_login &&
    codes.every((code) => get().hasPermission(code)),
}));
