import { create } from 'zustand';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title?: string;
  message: string;
  duration?: number; // in milliseconds, 0 means persist until closed
  timestamp: number;
}

interface NotificationState {
  notifications: NotificationItem[];
  addNotification: (item: Omit<NotificationItem, 'id' | 'timestamp'>) => string;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  showSuccess: (message: string, title?: string, duration?: number) => string;
  showError: (message: string, title?: string, duration?: number) => string;
  showWarning: (message: string, title?: string, duration?: number) => string;
  showInfo: (message: string, title?: string, duration?: number) => string;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],

  addNotification: ({ type, title, message, duration = 4000 }) => {
    const id = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newItem: NotificationItem = {
      id,
      type,
      title,
      message,
      duration,
      timestamp: Date.now()
    };

    set((state) => ({
      // Limit to at most 5 concurrent notifications to prevent visual clutter
      notifications: [newItem, ...state.notifications].slice(0, 5)
    }));

    if (duration > 0) {
      setTimeout(() => {
        get().removeNotification(id);
      }, duration);
    }

    return id;
  },

  removeNotification: (id: string) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id)
    }));
  },

  clearAll: () => {
    set({ notifications: [] });
  },

  showSuccess: (message: string, title: string = 'Thành công', duration = 4000) => {
    return get().addNotification({ type: 'success', title, message, duration });
  },

  showError: (message: string, title: string = 'Lỗi xử lý', duration = 5000) => {
    return get().addNotification({ type: 'error', title, message, duration });
  },

  showWarning: (message: string, title: string = 'Cảnh báo', duration = 4500) => {
    return get().addNotification({ type: 'warning', title, message, duration });
  },

  showInfo: (message: string, title: string = 'Thông tin', duration = 4000) => {
    return get().addNotification({ type: 'info', title, message, duration });
  }
}));

// Quick helpers for non-React contexts (such as Axios interceptors)
export const notify = {
  success: (message: string, title?: string, duration?: number) =>
    useNotificationStore.getState().showSuccess(message, title, duration),
  error: (message: string, title?: string, duration?: number) =>
    useNotificationStore.getState().showError(message, title, duration),
  warning: (message: string, title?: string, duration?: number) =>
    useNotificationStore.getState().showWarning(message, title, duration),
  info: (message: string, title?: string, duration?: number) =>
    useNotificationStore.getState().showInfo(message, title, duration)
};
