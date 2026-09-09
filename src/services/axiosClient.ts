import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../stores/authStore';
import { notify } from '../stores/notificationStore';
import { useLoadingStore } from '../stores/loadingStore';

// Extend AxiosRequestConfig to allow skipping global notifications or loading overlay if needed
declare module 'axios' {
  export interface AxiosRequestConfig {
    skipGlobalError?: boolean;
    customSuccessMessage?: string;
    skipLoading?: boolean;
    loadingMessage?: string;
  }
}

// Read Base URL from environment variable VITE_API_URL (defaults to /api/v1)
// Mặc định gọi /api/v1 (được server Express proxy trực tiếp tới https://letran-backend.onrender.com/api/v1 để vượt qua rào cản CORS trên trình duyệt)
const rawBaseUrl = import.meta.env.VITE_API_URL || '/api/v1';

// Nếu người dùng cấu hình trực tiếp domain render trong trình duyệt, tự động định tuyến qua proxy /api/v1 nội bộ
// nhằm tránh lỗi trình duyệt chặn CORS "Disallowed CORS origin" do backend Render giới hạn origin.
const isBrowser = typeof window !== 'undefined';
const isDirectRenderBackend = typeof rawBaseUrl === 'string' && rawBaseUrl.includes('letran-backend.onrender.com');
const API_BASE_URL = (isBrowser && isDirectRenderBackend) ? '/api/v1' : rawBaseUrl;

export const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// REQUEST INTERCEPTOR
axiosClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Retrieve token from Zustand Auth Store (or fallback to localStorage)
    const token = useAuthStore.getState().token || localStorage.getItem('auth_token');

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Trigger global loading with anti-flicker debounce unless explicitly skipped
    if (!config.skipLoading) {
      useLoadingStore.getState().startLoading(config.loadingMessage);
    }

    return config;
  },
  (error) => {
    useLoadingStore.getState().stopLoading();
    return Promise.reject(error);
  }
);

// RESPONSE INTERCEPTOR
axiosClient.interceptors.response.use(
  (response) => {
    // Release loading counter when API call completes
    if (!response.config?.skipLoading) {
      useLoadingStore.getState().stopLoading();
    }

    // Optionally trigger centralized success notification if configured on request
    if (response.config?.customSuccessMessage) {
      notify.success(response.config.customSuccessMessage);
    }

    // Return the response body directly for cleaner caller syntax
    return response.data;
  },
  (error: AxiosError<{ message?: string; error?: string }>) => {
    // Release loading counter on API failure
    if (!error.config?.skipLoading) {
      useLoadingStore.getState().stopLoading();
    }

    const config = error.config;
    const shouldSkipNotification = config?.skipGlobalError;

    if (!shouldSkipNotification) {
      if (!error.response) {
        // Network Error or timeout
        notify.error(
          `Không thể kết nối đến máy chủ (${API_BASE_URL}). Vui lòng kiểm tra kết nối mạng hoặc biến môi trường VITE_API_URL.`,
          'Lỗi kết nối mạng'
        );
      } else {
        const { status, data } = error.response;
        const serverMessage =
          data?.message ||
          (data as any)?.error?.message ||
          (typeof (data as any)?.error === 'string' ? (data as any).error : undefined);

        switch (status) {
          case 401:
            // Token expired or invalid
            const currentToken = useAuthStore.getState().token;
            if (currentToken) {
              useAuthStore.getState().clearSession();
              notify.error(
                serverMessage || 'Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.',
                'Hết hạn phiên'
              );
            } else {
              notify.error(serverMessage || 'Email hoặc mật khẩu không chính xác.', 'Xác thực thất bại');
            }
            break;

          case 403:
            notify.error(
              serverMessage || 'Bạn không có quyền truy cập chức năng này (403 Forbidden).',
              'Truy cập bị từ chối'
            );
            break;

          case 404:
            notify.error(serverMessage || 'Không tìm thấy tài nguyên yêu cầu (404).', 'Không tìm thấy');
            break;

          case 422:
          case 400:
            notify.error(serverMessage || 'Dữ liệu yêu cầu không hợp lệ.', 'Yêu cầu không hợp lệ');
            break;

          case 500:
          case 502:
          case 503:
            notify.error(
              serverMessage || 'Máy chủ gặp sự cố nội bộ (500). Vui lòng thử lại sau.',
              'Lỗi máy chủ'
            );
            break;

          default:
            notify.error(
              serverMessage || `Đã xảy ra lỗi (${status}).`,
              'Lỗi hệ thống'
            );
            break;
        }
      }
    }

    return Promise.reject(error);
  }
);

export default axiosClient;
