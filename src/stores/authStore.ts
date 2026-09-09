import { create } from 'zustand';
import { User, Role } from '../types';

export interface PendingFirstLoginUser {
  email: string;
  name: string;
}

interface AuthState {
  user: User | null;
  role: Role | null;
  permissions: string[];
  token: string | null;
  isLoading: boolean;
  pendingFirstLoginUser: PendingFirstLoginUser | null;

  // Actions
  saveSession: (token: string, user: User, role: Role, permissions: string[]) => void;
  clearSession: () => void;
  setPendingFirstLoginUser: (pending: PendingFirstLoginUser | null) => void;
  setLoading: (loading: boolean) => void;
  setUser: (user: User | null) => void;
  setRole: (role: Role | null) => void;
  setPermissions: (permissions: string[]) => void;

  // Permissions checkers
  hasPermission: (code: string) => boolean;
  hasAnyPermission: (codes: string[]) => boolean;
  hasAllPermissions: (codes: string[]) => boolean;
}

// Safely get initial data from storage
const getInitialState = () => {
  try {
    const savedToken = localStorage.getItem('auth_token');
    const savedUser = localStorage.getItem('auth_user');
    const savedRole = localStorage.getItem('auth_role');
    const savedPermissions = localStorage.getItem('auth_permissions');
    const savedPending = sessionStorage.getItem('pending_first_login');

    return {
      token: savedToken || null,
      user: savedUser ? JSON.parse(savedUser) : null,
      role: savedRole ? JSON.parse(savedRole) : null,
      permissions: savedPermissions ? JSON.parse(savedPermissions) : [],
      pendingFirstLoginUser: savedPending ? JSON.parse(savedPending) : null
    };
  } catch {
    return {
      token: null,
      user: null,
      role: null,
      permissions: [],
      pendingFirstLoginUser: null
    };
  }
};

const initial = getInitialState();

export const useAuthStore = create<AuthState>((set, get) => ({
  user: initial.user,
  role: initial.role,
  permissions: initial.permissions,
  token: initial.token,
  isLoading: false,
  pendingFirstLoginUser: initial.pendingFirstLoginUser,

  saveSession: (token, user, role, permissions) => {
    try {
      localStorage.setItem('auth_token', token);
      localStorage.setItem('auth_user', JSON.stringify(user));
      localStorage.setItem('auth_role', JSON.stringify(role));
      localStorage.setItem('auth_permissions', JSON.stringify(permissions));
      sessionStorage.removeItem('pending_first_login');
    } catch {
      // ignore storage errors
    }

    set({
      token,
      user,
      role,
      permissions,
      pendingFirstLoginUser: null
    });
  },

  clearSession: () => {
    try {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      localStorage.removeItem('auth_role');
      localStorage.removeItem('auth_permissions');
    } catch {
      // ignore
    }

    set({
      token: null,
      user: null,
      role: null,
      permissions: []
    });
  },

  setPendingFirstLoginUser: (pending) => {
    try {
      if (pending) {
        sessionStorage.setItem('pending_first_login', JSON.stringify(pending));
      } else {
        sessionStorage.removeItem('pending_first_login');
      }
    } catch {
      // ignore
    }

    set({ pendingFirstLoginUser: pending });
  },

  setLoading: (loading) => set({ isLoading: loading }),

  setUser: (user) => set({ user }),
  setRole: (role) => set({ role }),
  setPermissions: (permissions) => set({ permissions }),

  hasPermission: (code: string) => {
    const { user, role, permissions } = get();
    if (!user) return false;
    if (role?.id === 'admin' || user.roleId === 'admin') return true;
    return permissions.includes(code);
  },

  hasAnyPermission: (codes: string[]) => {
    const { user, role, permissions } = get();
    if (!user) return false;
    if (role?.id === 'admin' || user.roleId === 'admin') return true;
    return codes.some((code) => permissions.includes(code));
  },

  hasAllPermissions: (codes: string[]) => {
    const { user, role, permissions } = get();
    if (!user) return false;
    if (role?.id === 'admin' || user.roleId === 'admin') return true;
    return codes.every((code) => permissions.includes(code));
  }
}));
