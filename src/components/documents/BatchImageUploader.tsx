import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  Camera,
  Smartphone,
  Laptop,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ZoomIn,
  X,
  FileCheck,
  Save,
  RotateCcw,
  Sparkles,
  Download,
  FileSpreadsheet,
  FileText as FileTextIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DocumentType, ImageUploadItem, UploadedDocument } from '../../types';
import DocumentTypeAutocomplete from './DocumentTypeAutocomplete';
import CameraCaptureModal from './CameraCaptureModal';
import { documentsApi } from '../../services/api';
import { notify } from '../../stores/notificationStore';

interface BatchImageUploaderProps {
  onUploadComplete?: (newDocs: UploadedDocument[]) => void;
  onCancel?: () => void;
}

export const BatchImageUploader: React.FC<BatchImageUploaderProps> = ({
  onUploadComplete,
  onCancel
}) => {
  const [selectedDocType, setSelectedDocType] = useState<DocumentType | null>(null);
  const [images, setImages] = useState<ImageUploadItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progressPercent, setProgressPercent] = useState(0);
  const [activeProcessingName, setActiveProcessingName] = useState('');
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [previewZoomImage, setPreviewZoomImage] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Trạng thái Xuất File từ BE sau khi hoàn tất lưu
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'excel' | 'docx'>('pdf');
  const [savedDocumentResults, setSavedDocumentResults] = useState<UploadedDocument[]>([]);

  // Hidden inputs
  const computerInputRef = useRef<HTMLInputElement>(null);
  const phoneGalleryInputRef = useRef<HTMLInputElement>(null);
  const mobileCameraInputRef = useRef<HTMLInputElement>(null);

  // Chuyển File object sang Base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  // Format dung lượng byte sang KB/MB
  const formatFileSize = (bytes: number): string => {
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    return `${Math.round(bytes / 1024)} KB`;
  };

  // Xử lý nạp mảng File từ input hoặc drag drop
  const handleFilesAdded = async (files: FileList | File[], source: 'computer' | 'device' | 'camera') => {
    const fileArray = Array.from(files).filter((f) => f.type.startsWith('image/'));

    if (fileArray.length === 0) {
      notify.warning('Vui lòng chỉ chọn các tệp tin định dạng hình ảnh (JPG, PNG, WEBP, GIF)');
      return;
    }

    const newItems: ImageUploadItem[] = [];

    for (const file of fileArray) {
      try {
        const base64Data = await fileToBase64(file);
        newItems.push({
          id: 'img_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
          name: file.name,
          size: file.size,
          sizeFormatted: formatFileSize(file.size),
          previewUrl: base64Data,
          base64Data,
          source,
          status: 'pending'
        });
      } catch (err) {
        console.error('Lỗi đọc file hình ảnh:', err);
      }
    }

    setImages((prev) => [...prev, ...newItems]);
    notify.info(`Đã thêm ${newItems.length} hình ảnh vào danh sách chờ tải lên`);
  };

  // Xử lý nhận ảnh từ CameraCaptureModal
  const handleCameraModalCaptured = (capturedItems: ImageUploadItem[]) => {
    setImages((prev) => [...prev, ...capturedItems]);
    notify.info(`Đã nhận ${capturedItems.length} ảnh chụp từ Camera`);
  };

  // Xóa 1 ảnh
  const handleRemoveImage = (id: string) => {
    if (isUploading) return;
    setImages((prev) => prev.filter((img) => img.id !== id));
  };

  // Xóa toàn bộ ảnh
  const handleClearAll = () => {
    if (isUploading) return;
    setImages([]);
    setProgressPercent(0);
    setCurrentIndex(0);
  };

  // Kéo thả Dropzone
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isUploading) setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (isUploading) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesAdded(e.dataTransfer.files, 'computer');
    }
  };

  // HÀM LƯU TẤT CẢ ẢNH - DUYỆT MẢNG TỪNG HÌNH VÀ CALL API VỚI PROGRESS BAR
  const handleSaveAndUploadAll = async () => {
    // 1. Kiểm tra validation
    if (!selectedDocType) {
      notify.error('Vui lòng chọn Loại Tài Liệu từ ô Autocomplete trước khi lưu!');
      return;
    }

    if (images.length === 0) {
      notify.warning('Danh sách trống. Vui lòng chọn ít nhất 1 hình ảnh để lưu!');
      return;
    }

    // 2. Khởi tạo trạng thái upload
    setIsUploading(true);
    setCurrentIndex(0);
    setProgressPercent(0);

    const total = images.length;
    const uploadedResults: UploadedDocument[] = [];
    let successCount = 0;

    // 3. Duyệt mảng tuần tự từng hình một
    for (let i = 0; i < total; i++) {
      const currentItem = images[i];
      setCurrentIndex(i + 1);
      setActiveProcessingName(currentItem.name);

      // Cập nhật status của ảnh hiện tại thành uploading
      setImages((prev) =>
        prev.map((img, idx) => (idx === i ? { ...img, status: 'uploading' } : img))
      );

      try {
        // Gọi API backend lưu hình ảnh
        const response = await documentsApi.uploadSingle({
          documentTypeId: selectedDocType.id,
          documentTypeName: selectedDocType.name,
          fileName: currentItem.name,
          fileSize: currentItem.size,
          fileType: 'image/jpeg',
          imageBase64: currentItem.base64Data,
          source: currentItem.source,
          index: i,
          total
        });

        if (response.data?.success && response.data?.data) {
          uploadedResults.push(response.data.data);
          successCount++;
        }

        // Cập nhật trạng thái ảnh thành completed
        setImages((prev) =>
          prev.map((img, idx) => (idx === i ? { ...img, status: 'completed' } : img))
        );
      } catch (err: unknown) {
        console.error(`Lỗi khi lưu ảnh thứ ${i + 1}:`, err);
        // Cập nhật trạng thái ảnh thành error
        setImages((prev) =>
          prev.map((img, idx) =>
            idx === i
              ? {
                  ...img,
                  status: 'error',
                  errorMessage: 'Không thể kết nối máy chủ để lưu ảnh này'
                }
              : img
          )
        );
      }

      // Cập nhật phần trăm tiến độ
      const currentProgress = Math.round(((i + 1) / total) * 100);
      setProgressPercent(currentProgress);
    }

    // 4. Hoàn tất chu kỳ upload
    setIsUploading(false);
    setActiveProcessingName('');
    setSavedDocumentResults(uploadedResults);

    if (successCount === total) {
      notify.success(`Đã lưu thành công toàn bộ ${total} hình ảnh vào hệ thống! Bạn có thể Xuất file ngay.`);
    } else {
      notify.warning(`Đã hoàn tất: ${successCount}/${total} ảnh thành công.`);
    }

    if (onUploadComplete && uploadedResults.length > 0) {
      onUploadComplete(uploadedResults);
    }
  };

  // Kiểm tra xem tất cả hình ảnh đã lưu thành công chưa
  const isAllSavedSuccessfully =
    images.length > 0 &&
    !isUploading &&
    progressPercent === 100 &&
    images.every((i) => i.status === 'completed');

  // Hàm gọi API Xuất File từ BE về máy
  const handleExportFile = async (format: 'pdf' | 'excel' | 'docx' = exportFormat) => {
    if (!selectedDocType) {
      notify.error('Vui lòng chọn loại tài liệu trước khi xuất file!');
      return;
    }

    if (images.length === 0) {
      notify.warning('Chưa có hình ảnh nào để xuất file!');
      return;
    }

    setIsExporting(true);
    try {
      notify.info(`Đang gọi máy chủ để xuất gói hồ sơ chứng từ (${format.toUpperCase()})...`);

      const response = await documentsApi.exportPackage({
        documentTypeId: selectedDocType.id,
        documentTypeName: selectedDocType.name,
        documentTypeCode: selectedDocType.code,
        format,
        imageFiles: images.map((img) => ({
          name: img.name,
          sizeFormatted: img.sizeFormatted,
          source: img.source
        }))
      });

      // Tạo Blob và download về trình duyệt
      const contentType =
        format === 'excel'
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : format === 'docx'
          ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          : 'application/pdf';

      const blob = new Blob([response.data as BlobPart], { type: contentType });

      // Lấy tên file từ header Content-Disposition nếu có
      let downloadFileName = `Ho_So_Xuat_${selectedDocType.code}_${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.${
        format === 'excel' ? 'xlsx' : format === 'docx' ? 'docx' : 'pdf'
      }`;

      const disposition = (response.headers as Record<string, string>)?.[
        'content-disposition'
      ];
      if (disposition && disposition.includes('filename=')) {
        const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition);
        if (matches && matches[1]) {
          downloadFileName = matches[1].replace(/['"]/g, '');
        }
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', downloadFileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      notify.success(`Đã xuất và tải về thành công tệp: "${downloadFileName}" từ máy chủ!`);
    } catch (err: unknown) {
      console.error('Lỗi khi xuất file từ BE:', err);
      notify.error('Không thể tải file từ máy chủ. Vui lòng thử lại sau!');
    } finally {
      setIsExporting(false);
    }
  };

  // Làm mới để tải đợt ảnh mới
  const handleResetForNewBatch = () => {
    setImages([]);
    setProgressPercent(0);
    setCurrentIndex(0);
    setActiveProcessingName('');
    setSavedDocumentResults([]);
    notify.info('Đã làm mới khung làm việc để chuẩn bị đợt tải ảnh mới');
  };

  return (
    <div className="space-y-6">
      {/* 1. Phần Autocomplete chọn loại tài liệu */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <DocumentTypeAutocomplete
          selectedDocType={selectedDocType}
          onSelect={setSelectedDocType}
          disabled={isUploading}
        />
      </div>

      {/* 2. Phần Upload hình ảnh đa nguồn */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
              2. Tải Lên & Chụp Hình Ảnh Chứng Từ <span className="text-rose-500">*</span>
            </label>
            <p className="text-xs text-slate-500 mt-0.5">
              Hỗ trợ chọn từ máy tính, thư viện điện thoại hoặc chụp trực tiếp từ Camera
            </p>
          </div>

          {images.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600">
                Đã chọn: <span className="text-indigo-600 font-bold">{images.length}</span> hình
              </span>
              {!isUploading && (
                <button
                  type="button"
                  id="btn-clear-all-images"
                  onClick={handleClearAll}
                  className="text-xs text-slate-400 hover:text-rose-600 transition-colors p-1"
                  title="Xóa tất cả ảnh đã chọn"
                >
                  Xóa tất cả
                </button>
              )}
            </div>
          )}
        </div>

        {/* 3 Nút Chọn Nguồn Ảnh Rõ Ràng */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Nguồn 1: Máy tính / Laptop */}
          <button
            type="button"
            id="btn-source-computer"
            disabled={isUploading}
            onClick={() => computerInputRef.current?.click()}
            className="p-4 rounded-2xl border-2 border-dashed border-slate-200 hover:border-indigo-400 bg-slate-50/70 hover:bg-indigo-50/40 flex flex-col items-center text-center transition-all group active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
          >
            <div className="w-11 h-11 rounded-xl bg-white shadow-2xs border border-slate-200 text-indigo-600 flex items-center justify-center mb-2 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all">
              <Laptop className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-900 group-hover:text-indigo-700">
              Chọn Từ Máy Tính
            </span>
            <span className="text-[11px] text-slate-400 mt-0.5">Kéo thả hoặc duyệt file</span>
          </button>

          {/* Nguồn 2: Thư viện ảnh Điện Thoại / Thiết bị */}
          <button
            type="button"
            id="btn-source-phone-gallery"
            disabled={isUploading}
            onClick={() => phoneGalleryInputRef.current?.click()}
            className="p-4 rounded-2xl border-2 border-dashed border-slate-200 hover:border-emerald-400 bg-slate-50/70 hover:bg-emerald-50/40 flex flex-col items-center text-center transition-all group active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
          >
            <div className="w-11 h-11 rounded-xl bg-white shadow-2xs border border-slate-200 text-emerald-600 flex items-center justify-center mb-2 group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all">
              <Smartphone className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-900 group-hover:text-emerald-700">
              Thư Viện Điện Thoại
            </span>
            <span className="text-[11px] text-slate-400 mt-0.5">Chọn từ Album ảnh</span>
          </button>

          {/* Nguồn 3: Chụp Trực Tiếp (Camera) */}
          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              id="btn-source-camera-modal"
              disabled={isUploading}
              onClick={() => setShowCameraModal(true)}
              className="flex-1 p-4 rounded-2xl border-2 border-dashed border-slate-200 hover:border-rose-400 bg-slate-50/70 hover:bg-rose-50/40 flex flex-col items-center text-center transition-all group active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
            >
              <div className="w-11 h-11 rounded-xl bg-white shadow-2xs border border-slate-200 text-rose-600 flex items-center justify-center mb-2 group-hover:scale-110 group-hover:bg-rose-600 group-hover:text-white transition-all">
                <Camera className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-slate-900 group-hover:text-rose-700">
                Chụp Ảnh Trực Tiếp
              </span>
              <span className="text-[11px] text-slate-400 mt-0.5">Bật máy ảnh chụp ngay</span>
            </button>

            {/* Nút chụp nhanh cho thiết bị di động với capture="environment" */}
            <button
              type="button"
              id="btn-trigger-mobile-native-camera"
              disabled={isUploading}
              onClick={() => mobileCameraInputRef.current?.click()}
              className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 py-1 flex items-center justify-center gap-1"
            >
              <Camera className="w-3 h-3" />
              <span>Hoặc mở Camera Native Điện Thoại</span>
            </button>
          </div>
        </div>

        {/* Hidden inputs để kích hoạt hộp thoại chọn file */}
        <input
          ref={computerInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) handleFilesAdded(e.target.files, 'computer');
            e.target.value = '';
          }}
        />

        <input
          ref={phoneGalleryInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) handleFilesAdded(e.target.files, 'device');
            e.target.value = '';
          }}
        />

        <input
          ref={mobileCameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) handleFilesAdded(e.target.files, 'camera');
            e.target.value = '';
          }}
        />

        {/* Vùng Dropzone kéo thả mở rộng */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => {
            if (!isUploading) computerInputRef.current?.click();
          }}
          className={`cursor-pointer rounded-2xl border-2 border-dashed p-6 text-center transition-all ${
            isDragOver
              ? 'border-indigo-500 bg-indigo-50/50 scale-[1.005]'
              : 'border-slate-200 hover:border-slate-300 bg-slate-50/40 hover:bg-slate-50'
          }`}
        >
          <UploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-xs font-semibold text-slate-700">
            Kéo và thả nhiều file ảnh vào đây, hoặc click để mở hộp thoại
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Hỗ trợ PNG, JPG, JPEG, WEBP • Không giới hạn số lượng ảnh
          </p>
        </div>

        {/* Danh Sách Hình Ảnh Đã Chọn (Gallery Grid) */}
        {images.length > 0 && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Danh sách hình ảnh ({images.length} ảnh)
              </h4>
              <span className="text-[11px] text-slate-500">
                Tổng dung lượng:{' '}
                <strong className="text-slate-800">
                  {formatFileSize(images.reduce((acc, curr) => acc + curr.size, 0))}
                </strong>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {images.map((item, idx) => (
                <div
                  key={item.id}
                  className={`relative rounded-2xl border overflow-hidden bg-white shadow-2xs group transition-all flex flex-col ${
                    item.status === 'uploading'
                      ? 'border-indigo-500 ring-2 ring-indigo-500/20'
                      : item.status === 'completed'
                      ? 'border-emerald-400'
                      : item.status === 'error'
                      ? 'border-rose-400'
                      : 'border-slate-200'
                  }`}
                >
                  {/* Container Ảnh & Thumbnail */}
                  <div className="relative aspect-square bg-slate-100 overflow-hidden">
                    <img
                      src={item.previewUrl}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />

                    {/* Huy hiệu thứ tự ảnh */}
                    <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-[10px] font-mono font-bold text-white">
                      #{idx + 1}
                    </div>

                    {/* Nút phóng to xem ảnh */}
                    <button
                      type="button"
                      onClick={() => setPreviewZoomImage(item.previewUrl)}
                      className="absolute top-1.5 right-1.5 p-1 rounded-md bg-black/50 text-white hover:bg-black/70 backdrop-blur-xs transition-colors opacity-0 group-hover:opacity-100"
                      title="Xem ảnh lớn"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>

                    {/* Nút xóa ảnh */}
                    {!isUploading && item.status !== 'completed' && (
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(item.id)}
                        className="absolute bottom-1.5 right-1.5 p-1 rounded-md bg-rose-600 text-white hover:bg-rose-700 shadow-xs transition-colors"
                        title="Xóa ảnh này"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Overlay trạng thái xử lý trên thumbnail */}
                    {item.status === 'uploading' && (
                      <div className="absolute inset-0 bg-indigo-900/60 backdrop-blur-2xs flex flex-col items-center justify-center text-white">
                        <Loader2 className="w-6 h-6 animate-spin text-white mb-1" />
                        <span className="text-[10px] font-bold">Đang lưu...</span>
                      </div>
                    )}

                    {item.status === 'completed' && (
                      <div className="absolute inset-0 bg-emerald-900/40 flex items-center justify-center">
                        <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                      </div>
                    )}

                    {item.status === 'error' && (
                      <div className="absolute inset-0 bg-rose-900/50 flex flex-col items-center justify-center text-white p-2 text-center">
                        <AlertCircle className="w-6 h-6 text-rose-300 mb-0.5" />
                        <span className="text-[10px] font-bold text-white">Lỗi lưu</span>
                      </div>
                    )}
                  </div>

                  {/* Thông tin tên file và dung lượng */}
                  <div className="p-2 space-y-0.5 text-left">
                    <p className="text-[11px] font-medium text-slate-800 truncate" title={item.name}>
                      {item.name}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>{item.sizeFormatted}</span>
                      <span className="capitalize">{item.source}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. THANH PROGRESS BAR HIỂN THỊ TIẾN ĐỘ LƯU HÌNH DƯỚI BACKEND */}
        <AnimatePresence>
          {(isUploading || progressPercent > 0) && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950 text-white shadow-lg space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {isUploading ? (
                    <div className="w-8 h-8 rounded-xl bg-indigo-600/50 flex items-center justify-center">
                      <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-xl bg-emerald-600/50 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    </div>
                  )}

                  <div>
                    <h5 className="text-xs font-bold text-white tracking-wide">
                      {isUploading
                        ? `Đang Lưu Dữ Liệu Lên Máy Chủ (${currentIndex}/${images.length})`
                        : 'Hoàn Tất Lưu Trữ Hình Ảnh'}
                    </h5>
                    <p className="text-[11px] text-slate-300 truncate max-w-sm">
                      {isUploading && activeProcessingName
                        ? `Đang lưu: ${activeProcessingName}`
                        : `Toàn bộ ${images.length} hình ảnh đã được lưu vào danh mục ${selectedDocType?.name}`}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-base font-extrabold font-mono text-indigo-300">
                    {progressPercent}%
                  </span>
                  <div className="text-[10px] text-slate-400 font-medium">Tiến độ lưu BE</div>
                </div>
              </div>

              {/* Thanh Progress Bar */}
              <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-700/70">
                <motion.div
                  className="h-full bg-gradient-to-r from-indigo-500 via-sky-400 to-emerald-400 rounded-full transition-all duration-300 shadow-sm"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>
                  Đã hoàn tất:{' '}
                  <strong className="text-white">
                    {images.filter((i) => i.status === 'completed').length}/{images.length}
                  </strong>{' '}
                  ảnh
                </span>
                <span>
                  Loại chứng từ:{' '}
                  <strong className="text-indigo-300">{selectedDocType?.code || 'N/A'}</strong>
                </span>
              </div>

              {/* Nút Xuất File Nổi Bật Ngay Trên Banner Khi Toàn Bộ Ảnh Đã Lưu Thành Công */}
              {isAllSavedSuccessfully && (
                <div className="pt-3 border-t border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-800/60 p-3 rounded-xl">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Tất cả ảnh đã lưu thành công! Sẵn sàng xuất gói tài liệu:</span>
                    </div>
                    <p className="text-[11px] text-slate-300">
                      Máy chủ biên tập tệp hồ sơ kèm chữ ký số và bảng kê hình ảnh để tải về máy.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Chọn định dạng xuất file */}
                    <div className="inline-flex rounded-lg bg-slate-900/80 p-0.5 border border-slate-700">
                      <button
                        type="button"
                        id="btn-format-pdf"
                        onClick={() => setExportFormat('pdf')}
                        className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
                          exportFormat === 'pdf'
                            ? 'bg-rose-500 text-white shadow-xs'
                            : 'text-slate-400 hover:text-white'
                        }`}
                        title="Định dạng PDF"
                      >
                        PDF
                      </button>
                      <button
                        type="button"
                        id="btn-format-excel"
                        onClick={() => setExportFormat('excel')}
                        className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
                          exportFormat === 'excel'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-slate-400 hover:text-white'
                        }`}
                        title="Định dạng Excel (XLSX)"
                      >
                        Excel
                      </button>
                      <button
                        type="button"
                        id="btn-format-docx"
                        onClick={() => setExportFormat('docx')}
                        className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
                          exportFormat === 'docx'
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'text-slate-400 hover:text-white'
                        }`}
                        title="Định dạng Word (DOCX)"
                      >
                        Word
                      </button>
                    </div>

                    <button
                      type="button"
                      id="btn-export-file-from-banner"
                      onClick={() => handleExportFile(exportFormat)}
                      disabled={isExporting}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white shadow-md shadow-emerald-950/40 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isExporting ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Đang Tải...</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-3.5 h-3.5" />
                          <span>Xuất File</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* 4. Hàng Nút Hành Động (Lưu / Huỷ / Xuất File / Đợt Mới) */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              {isAllSavedSuccessfully
                ? 'Tất cả ảnh đã lưu thành công vào cơ sở dữ liệu. Bấm "Xuất File" để tải tài liệu từ máy chủ về máy.'
                : 'Mỗi hình ảnh sẽ được mã hóa và đồng bộ trực tiếp vào cơ sở dữ liệu tài liệu.'}
            </span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {isAllSavedSuccessfully ? (
              <>
                <button
                  type="button"
                  id="btn-reset-uploader-new-batch"
                  onClick={handleResetForNewBatch}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Tải Đợt Mới</span>
                </button>

                {onCancel && (
                  <button
                    type="button"
                    id="btn-back-to-list-after-save"
                    onClick={onCancel}
                    className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                  >
                    Xem Kho Tài Liệu
                  </button>
                )}

                <button
                  type="button"
                  id="btn-export-file-main"
                  onClick={() => handleExportFile(exportFormat)}
                  disabled={isExporting}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-md hover:shadow-emerald-500/25 active:scale-98 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang Xuất File Từ BE...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>Xuất File ({exportFormat.toUpperCase()})</span>
                    </>
                  )}
                </button>
              </>
            ) : (
              <>
                {onCancel && (
                  <button
                    type="button"
                    id="btn-cancel-uploader"
                    onClick={onCancel}
                    disabled={isUploading}
                    className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition-colors disabled:opacity-50"
                  >
                    Hủy Bỏ
                  </button>
                )}

                <button
                  type="button"
                  id="btn-save-and-upload-images"
                  onClick={handleSaveAndUploadAll}
                  disabled={isUploading || images.length === 0 || !selectedDocType}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-indigo-500/25 active:scale-98 transition-all disabled:opacity-50 disabled:pointer-events-none"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang Lưu ({progressPercent}%)...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Lưu {images.length > 0 ? `${images.length} Ảnh` : 'Hình Ảnh'}</span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modal Camera Chụp Hình Trực Tiếp */}
      <CameraCaptureModal
        isOpen={showCameraModal}
        onClose={() => setShowCameraModal(false)}
        onImagesCaptured={handleCameraModalCaptured}
      />

      {/* Modal Lightbox Xem Phóng To Ảnh */}
      {previewZoomImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4 animate-in fade-in"
          onClick={() => setPreviewZoomImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl">
            <button
              type="button"
              id="btn-close-preview-zoom"
              onClick={() => setPreviewZoomImage(null)}
              className="absolute top-3 right-3 p-2 rounded-full bg-black/60 text-white hover:bg-black/90 transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={previewZoomImage}
              alt="Xem trước hình ảnh"
              className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default BatchImageUploader;
