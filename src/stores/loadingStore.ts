import { create } from 'zustand';

interface LoadingState {
  /** Số lượng API requests bất đồng bộ đang trong trạng thái chờ xử lý */
  activeRequests: number;
  /** Trạng thái hiển thị overlay trên giao diện người dùng */
  isLoading: boolean;
  /** Thông điệp hiển thị trong loading overlay */
  message: string;
  /** Bắt đầu theo dõi một request */
  startLoading: (customMessage?: string) => void;
  /** Kết thúc một request */
  stopLoading: () => void;
  /** Buộc đặt lại trạng thái (khi có sự cố hoặc người dùng đóng khẩn cấp) */
  forceReset: () => void;
}

// Cấu hình tham số chống nhấp nháy (Anti-flickering debounce & thresholds)
const SHOW_DELAY_MS = 100; // Nếu API hoàn tất trong < 100ms, không hiển thị overlay để tránh nháy giật
const MIN_VISIBLE_MS = 300; // Nếu đã hiển thị, duy trì tối thiểu 300ms để người dùng đọc được nội dung mượt mà
const HIDE_GRACE_PERIOD_MS = 250; // Khi activeRequests = 0, giữ thêm 250ms; nếu có API tiếp theo, duy trì liên tục không đóng/mở
const SAFETY_TIMEOUT_MS = 25000; // 25s tự động giải phóng tránh bị khóa màn hình vô tận nếu API treo

let showTimer: ReturnType<typeof setTimeout> | null = null;
let hideTimer: ReturnType<typeof setTimeout> | null = null;
let safetyTimer: ReturnType<typeof setTimeout> | null = null;
let shownTimestamp = 0;

export const useLoadingStore = create<LoadingState>((set, get) => ({
  activeRequests: 0,
  isLoading: false,
  message: 'Đang xử lý yêu cầu...',

  startLoading: (customMessage) => {
    // 1. HỦY BỎ hideTimer nếu đang trong giai đoạn chờ đóng
    // Điều này ngăn chặn việc overlay nhấp nháy biến mất rồi lại xuất hiện khi các API gọi nối tiếp nhau
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }

    const currentCount = get().activeRequests + 1;
    const currentIsLoading = get().isLoading;

    let displayMessage = customMessage || get().message;
    if (currentCount > 1) {
      displayMessage = customMessage || `Đang xử lý đồng thời ${currentCount} tác vụ...`;
    }

    set({
      activeRequests: currentCount,
      message: displayMessage
    });

    // 2. Kích hoạt safety timer nếu chưa có
    if (!safetyTimer) {
      safetyTimer = setTimeout(() => {
        console.warn('[LoadingStore] Safety timeout triggered. Resetting activeRequests to 0.');
        get().forceReset();
      }, SAFETY_TIMEOUT_MS);
    }

    // 3. Nếu overlay đã đang mở, không cần hẹn giờ mở lại
    if (currentIsLoading) {
      return;
    }

    // 4. Nếu chưa mở và chưa có timer mở, hẹn giờ mở sau SHOW_DELAY_MS
    if (!showTimer) {
      showTimer = setTimeout(() => {
        shownTimestamp = Date.now();
        set({ isLoading: true });
        showTimer = null;
      }, SHOW_DELAY_MS);
    }
  },

  stopLoading: () => {
    const currentCount = Math.max(0, get().activeRequests - 1);

    // Vẫn còn API khác đang chạy dở
    if (currentCount > 0) {
      set({
        activeRequests: currentCount,
        message: currentCount > 1
          ? `Đang xử lý đồng thời ${currentCount} tác vụ...`
          : 'Đang xử lý yêu cầu...'
      });
      return;
    }

    // Tất cả API đã xong (activeRequests === 0)
    set({ activeRequests: 0 });

    // Giải phóng safety timer
    if (safetyTimer) {
      clearTimeout(safetyTimer);
      safetyTimer = null;
    }

    // Trường hợp 1: API hoàn tất cực nhanh trước khi showTimer kịp kích hoạt
    if (showTimer) {
      clearTimeout(showTimer);
      showTimer = null;
      // Không mở overlay -> triệt tiêu hoàn toàn nhấp nháy cho fast requests
      return;
    }

    // Trường hợp 2: Overlay đang hiển thị trên màn hình
    if (get().isLoading) {
      const timeElapsed = Date.now() - shownTimestamp;
      const minDisplayRemaining = Math.max(0, MIN_VISIBLE_MS - timeElapsed);
      const delayToHide = Math.max(HIDE_GRACE_PERIOD_MS, minDisplayRemaining);

      if (hideTimer) {
        clearTimeout(hideTimer);
      }

      hideTimer = setTimeout(() => {
        set({
          isLoading: false,
          message: 'Đang xử lý yêu cầu...'
        });
        hideTimer = null;
      }, delayToHide);
    }
  },

  forceReset: () => {
    if (showTimer) {
      clearTimeout(showTimer);
      showTimer = null;
    }
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
    if (safetyTimer) {
      clearTimeout(safetyTimer);
      safetyTimer = null;
    }
    shownTimestamp = 0;
    set({
      activeRequests: 0,
      isLoading: false,
      message: 'Đang xử lý yêu cầu...'
    });
  }
}));

// Export helper gọn nhẹ để gọi từ bất kỳ đâu không cần hook
export const globalLoading = {
  start: (msg?: string) => useLoadingStore.getState().startLoading(msg),
  stop: () => useLoadingStore.getState().stopLoading(),
  reset: () => useLoadingStore.getState().forceReset()
};
