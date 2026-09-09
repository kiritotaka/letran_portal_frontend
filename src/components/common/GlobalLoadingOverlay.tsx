import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Loader2, Zap, X } from 'lucide-react';
import { useLoadingStore } from '../../stores/loadingStore';

export const GlobalLoadingOverlay: React.FC = () => {
  const { isLoading, activeRequests, message, forceReset } = useLoadingStore();
  const [showEmergencyDismiss, setShowEmergencyDismiss] = useState(false);

  // Nếu bị treo bất thường lâu hơn 6 giây, hiển thị nút bỏ qua khẩn cấp
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    if (isLoading) {
      timeout = setTimeout(() => {
        setShowEmergencyDismiss(true);
      }, 6000);
    } else {
      setShowEmergencyDismiss(false);
    }
    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [isLoading]);

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          id="global-api-loading-overlay"
          role="status"
          aria-live="polite"
          aria-busy="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/45 backdrop-blur-[2px] select-none p-4"
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 6 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="relative bg-white/95 backdrop-blur-md rounded-2xl p-6 shadow-2xl border border-slate-200/90 flex flex-col items-center max-w-xs w-full text-center"
          >
            {/* Vòng quay hiệu ứng xoay mượt mà */}
            <div className="relative w-14 h-14 flex items-center justify-center mb-3">
              {/* Vòng nền phát sáng mờ */}
              <div className="absolute inset-0 rounded-full bg-indigo-50 animate-ping opacity-35" />

              {/* Vòng tròn gradient động */}
              <div className="absolute inset-0 rounded-full border-3 border-indigo-100" />
              <Loader2 className="w-9 h-9 text-indigo-600 animate-spin relative z-10" />

              {/* Biểu tượng nhỏ ở tâm */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <Zap className="w-3.5 h-3.5 text-indigo-500 fill-indigo-100" />
              </div>
            </div>

            {/* Tiêu đề & Thông điệp */}
            <h3 className="text-sm font-bold text-slate-900 tracking-tight mb-1">
              Đang Đồng Bộ Dữ Liệu
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              {message || 'Hệ thống đang xử lý yêu cầu...'}
            </p>

            {/* Badge báo hiệu khi có nhiều luồng API chạy song song */}
            {activeRequests > 1 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-200/70 text-[11px] font-semibold text-indigo-700"
              >
                <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
                <span>{activeRequests} tiến trình bất đồng bộ</span>
              </motion.div>
            )}

            {/* Đường tiến độ thanh mảnh ở chân modal */}
            <div className="w-full bg-slate-100 h-1 rounded-full mt-4 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 w-1/3 rounded-full animate-pulse" />
            </div>

            {/* Nút thoát khẩn cấp nếu API treo quá lâu */}
            {showEmergencyDismiss && (
              <motion.button
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                type="button"
                id="btn-emergency-dismiss-loading"
                onClick={forceReset}
                className="mt-3.5 inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-rose-600 transition-colors"
                title="Đóng bảng chờ nếu hệ thống mạng bị nghẽn"
              >
                <X className="w-3 h-3" />
                <span>Bỏ qua bảng chờ (Mạng chậm)</span>
              </motion.button>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default GlobalLoadingOverlay;
