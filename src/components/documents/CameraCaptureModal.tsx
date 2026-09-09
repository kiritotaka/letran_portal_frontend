import React, { useState, useRef, useEffect } from 'react';
import { Camera, X, RefreshCw, Check, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { ImageUploadItem } from '../../types';

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImagesCaptured: (newImages: ImageUploadItem[]) => void;
}

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  isOpen,
  onClose,
  onImagesCaptured
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [capturedList, setCapturedList] = useState<ImageUploadItem[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [isInitializing, setIsInitializing] = useState(false);

  // Bật camera khi modal mở
  useEffect(() => {
    if (!isOpen) return;

    let isSubscribed = true;

    const startCamera = async () => {
      setIsInitializing(true);
      setErrorMsg(null);

      // Tắt stream cũ nếu có
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Trình duyệt không hỗ trợ trực tiếp MediaDevices API');
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        });

        if (isSubscribed) {
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(() => {});
          }
        } else {
          stream.getTracks().forEach((t) => t.stop());
        }
      } catch (err: unknown) {
        if (isSubscribed) {
          console.error('Lỗi khởi động camera:', err);
          setErrorMsg(
            'Không thể kết nối máy ảnh. Vui lòng cho phép quyền truy cập Camera trên trình duyệt hoặc sử dụng tính năng chọn ảnh từ thiết bị.'
          );
        }
      } finally {
        if (isSubscribed) {
          setIsInitializing(false);
        }
      }
    };

    startCamera();

    return () => {
      isSubscribed = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [isOpen, facingMode]);

  // Đổi camera trước/sau
  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Chụp ảnh từ video stream
  const handleCapture = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.88);

    // Tính dung lượng ước lượng từ base64
    const approximateBytes = Math.round((dataUrl.length * 3) / 4);
    const sizeFormatted =
      approximateBytes >= 1024 * 1024
        ? `${(approximateBytes / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.round(approximateBytes / 1024)} KB`;

    const newImage: ImageUploadItem = {
      id: 'cam_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      name: `Anh_chup_camera_${new Date().toISOString().replace(/[:.]/g, '-')}.jpg`,
      size: approximateBytes,
      sizeFormatted,
      previewUrl: dataUrl,
      base64Data: dataUrl,
      source: 'camera',
      status: 'pending'
    };

    setCapturedList((prev) => [newImage, ...prev]);
  };

  // Xóa 1 ảnh vừa chụp trong modal
  const handleRemoveCaptured = (id: string) => {
    setCapturedList((prev) => prev.filter((img) => img.id !== id));
  };

  // Hoàn tất và gửi ra ngoài
  const handleDone = () => {
    if (capturedList.length > 0) {
      onImagesCaptured(capturedList);
    }
    setCapturedList([]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Chụp Ảnh Tài Liệu Trực Tiếp</h3>
              <p className="text-[11px] text-slate-500">
                Chụp ảnh rõ nét chứng từ, văn bản bằng camera thiết bị
              </p>
            </div>
          </div>

          <button
            type="button"
            id="btn-close-camera-modal"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Camera Viewport */}
        <div className="relative bg-slate-950 flex-1 min-h-[320px] flex items-center justify-center overflow-hidden">
          {errorMsg ? (
            <div className="p-6 text-center max-w-sm text-slate-300 space-y-3">
              <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
              <h4 className="text-sm font-bold text-white">Không Thể Truy Cập Máy Ảnh</h4>
              <p className="text-xs text-slate-400 leading-relaxed">{errorMsg}</p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition-colors"
                >
                  Thử lại Camera khác
                </button>
              </div>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full max-h-[420px] object-cover"
              />

              {/* Khung hướng dẫn chụp tài liệu */}
              <div className="absolute inset-6 border-2 border-dashed border-white/40 rounded-2xl pointer-events-none flex flex-col justify-between p-3">
                <div className="flex justify-between text-[10px] text-white/70 font-mono">
                  <span>┌ GÓC TRÊN TRÁI</span>
                  <span>GÓC TRÊN PHẢI ┐</span>
                </div>
                <div className="text-center">
                  <span className="px-3 py-1 rounded-full bg-black/40 text-white/90 text-[11px] font-medium backdrop-blur-xs">
                    Đặt tài liệu thẳng góc và trong khung viền
                  </span>
                </div>
                <div className="flex justify-between text-[10px] text-white/70 font-mono">
                  <span>└ GÓC DƯỚI TRÁI</span>
                  <span>GÓC DƯỚI PHẢI ┘</span>
                </div>
              </div>

              {/* Nút lật camera trước / sau */}
              <button
                type="button"
                id="btn-flip-camera"
                onClick={toggleFacingMode}
                disabled={isInitializing}
                className="absolute top-4 right-4 p-2.5 rounded-full bg-black/50 text-white hover:bg-black/70 backdrop-blur-xs transition-colors"
                title="Đổi camera trước / sau"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        {/* Danh sách ảnh vừa chụp nhanh trong modal */}
        {capturedList.length > 0 && (
          <div className="p-3 bg-slate-100/90 border-t border-slate-200 overflow-x-auto flex items-center gap-2.5">
            <div className="text-[11px] font-bold text-slate-700 shrink-0 px-1">
              Đã chụp ({capturedList.length}):
            </div>
            {capturedList.map((img) => (
              <div
                key={img.id}
                className="relative w-14 h-14 rounded-lg overflow-hidden border border-slate-300 shrink-0 group shadow-2xs"
              >
                <img src={img.previewUrl} alt={img.name} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => handleRemoveCaptured(img.id)}
                  className="absolute top-0.5 right-0.5 p-0.5 rounded bg-rose-600 text-white hover:bg-rose-700 transition-colors shadow-xs"
                  title="Xóa ảnh này"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Modal Controls */}
        <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          >
            Hủy Bỏ
          </button>

          <div className="flex items-center gap-3">
            {/* Nút Chụp Ảnh */}
            <button
              type="button"
              id="btn-trigger-capture"
              onClick={handleCapture}
              disabled={!!errorMsg || isInitializing}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-indigo-500/20 active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none"
            >
              <Camera className="w-4 h-4" />
              <span>Chụp Ảnh Này</span>
            </button>

            {/* Nút Đưa vào danh sách */}
            <button
              type="button"
              id="btn-finish-camera-capture"
              onClick={handleDone}
              disabled={capturedList.length === 0}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all disabled:opacity-40 disabled:pointer-events-none"
            >
              <Check className="w-4 h-4" />
              <span>Dùng {capturedList.length} Ảnh</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CameraCaptureModal;
