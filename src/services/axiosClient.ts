import { API_BASE_URL, refreshSession } from "./sessionClient";
import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "../stores/authStore";
import { notify } from "../stores/notificationStore";
import { useLoadingStore } from "../stores/loadingStore";

// Extend AxiosRequestConfig to allow skipping global notifications or loading overlay if needed
declare module "axios" {
  export interface AxiosRequestConfig {
    skipGlobalError?: boolean;
    authRetried?: boolean;
    sessionUserId?: string;
    loadingStarted?: boolean;
    customSuccessMessage?: string;
    skipLoading?: boolean;
    loadingMessage?: string;
  }
}

export const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// REQUEST INTERCEPTOR
axiosClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const authEndpoint = (config.url || "").startsWith("/auth/");
    let state = useAuthStore.getState();
    if (
      !authEndpoint &&
      state.refreshToken &&
      state.expiresAt &&
      state.expiresAt * 1000 <= Date.now() + 30000
    ) {
      await refreshSession();
      state = useAuthStore.getState();
      if (!state.token) throw new Error("Session ended");
    }
    if (!authEndpoint && state.token) {
      if (config.authRetried && config.sessionUserId !== state.user?.id)
        throw new Error("Session changed");
      config.sessionUserId = state.user?.id;
      config.headers.Authorization = `Bearer ${state.token}`;
    } else {
      config.headers.delete("Authorization");
    }

    // Trigger global loading with anti-flicker debounce unless explicitly skipped
    if (!config.skipLoading) {
      useLoadingStore.getState().startLoading(config.loadingMessage);
      config.loadingStarted = true;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// RESPONSE INTERCEPTOR
axiosClient.interceptors.response.use(
  (response) => {
    // Release loading counter when API call completes
    if (response.config?.loadingStarted) {
      useLoadingStore.getState().stopLoading();
      response.config.loadingStarted = false;
    }

    // Optionally trigger centralized success notification if configured on request
    if (response.config?.customSuccessMessage) {
      notify.success(response.config.customSuccessMessage);
    }

    // Return the response body directly for cleaner caller syntax
    return response.data;
  },
  async (error: AxiosError<{ message?: string; error?: string }>) => {
    // Release loading counter on API failure
    if (error.config?.loadingStarted) {
      useLoadingStore.getState().stopLoading();
      error.config.loadingStarted = false;
    }

    // Navigation and query cleanup can cancel requests without a network failure.
    if (axios.isCancel(error) || error.code === "ERR_CANCELED") {
      return Promise.reject(error);
    }

    const config = error.config;
    if (
      error.response?.status === 401 &&
      config &&
      !(config.url || "").startsWith("/auth/")
    ) {
      const state = useAuthStore.getState();
      if (config.sessionUserId !== state.user?.id) return Promise.reject(error);
      if (!config.authRetried && state.refreshToken) {
        config.authRetried = true;
        try {
          // A concurrent request may already have rotated this access token.
          if (config.headers.Authorization === `Bearer ${state.token}`)
            await refreshSession();
          if (!useAuthStore.getState().token) return Promise.reject(error);
          return axiosClient.request(config);
        } catch (refreshError) {
          return Promise.reject(refreshError);
        }
      }
      useAuthStore.getState().clearSession();
    }
    const shouldSkipNotification = config?.skipGlobalError;

    if (!shouldSkipNotification) {
      if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
        notify.error(
          "Máy chủ chưa phản hồi trong thời gian chờ. Vui lòng thử lại.",
          "Hết thời gian chờ",
        );
      } else if (!error.response) {
        notify.error(
          `Không thể kết nối đến máy chủ (${API_BASE_URL}). Vui lòng kiểm tra kết nối mạng hoặc biến môi trường VITE_API_URL.`,
          "Lỗi kết nối mạng",
        );
      } else {
        const { status, data } = error.response;
        const serverMessage =
          data?.message ||
          (data as any)?.error?.message ||
          (typeof (data as any)?.error === "string"
            ? (data as any).error
            : undefined);

        switch (status) {
          case 401:
            // Token expired or invalid
            const currentToken = useAuthStore.getState().token;
            if (currentToken) {
              useAuthStore.getState().clearSession();
              notify.error(
                serverMessage ||
                  "Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.",
                "Hết hạn phiên",
              );
            } else {
              notify.error(
                serverMessage || "Email hoặc mật khẩu không chính xác.",
                "Xác thực thất bại",
              );
            }
            break;

          case 403:
            notify.error(
              serverMessage ||
                "Bạn không có quyền truy cập chức năng này (403 Forbidden).",
              "Truy cập bị từ chối",
            );
            break;

          case 404:
            notify.error(
              serverMessage || "Không tìm thấy tài nguyên yêu cầu (404).",
              "Không tìm thấy",
            );
            break;

          case 422:
          case 400:
            notify.error(
              serverMessage || "Dữ liệu yêu cầu không hợp lệ.",
              "Yêu cầu không hợp lệ",
            );
            break;

          case 500:
          case 502:
          case 503:
            notify.error(
              serverMessage ||
                "Máy chủ gặp sự cố nội bộ (500). Vui lòng thử lại sau.",
              "Lỗi máy chủ",
            );
            break;

          default:
            notify.error(
              serverMessage || `Đã xảy ra lỗi (${status}).`,
              "Lỗi hệ thống",
            );
            break;
        }
      }
    }

    return Promise.reject(error);
  },
);

export default axiosClient;
