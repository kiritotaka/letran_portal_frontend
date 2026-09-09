import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Upload,
  Trash2,
  Eye,
  Plus,
  ArrowLeft,
  Image as ImageIcon,
  Smartphone,
  Camera,
  Laptop,
  RefreshCw,
  FolderOpen,
  X,
  Download,
  FileSpreadsheet,
  Search,
  Filter,
  Loader2
} from 'lucide-react';
import Can from '../components/guards/Can';
import withAuthorization from '../components/guards/withAuthorization';
import { notify } from '../stores/notificationStore';
import { UploadedDocument, DocumentType, PaginationMeta } from '../types';
import { documentsApi, documentTypesApi } from '../services/api';
import BatchImageUploader from '../components/documents/BatchImageUploader';
import { useDebounce } from '../hooks/useDebounce';
import Pagination from '../components/common/Pagination';

const DocumentsPageComponent: React.FC = () => {
  const [viewMode, setViewMode] = useState<'list' | 'upload'>('list');
  const [docs, setDocs] = useState<UploadedDocument[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExportingAll, setIsExportingAll] = useState(false);
  const [activeZoomImage, setActiveZoomImage] = useState<string | null>(null);

  // Server-side search & pagination state
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 350);
  const [docTypeFilter, setDocTypeFilter] = useState('all');
  const [docTypes, setDocTypes] = useState<DocumentType[]>([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(5);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 5,
    total: 0,
    totalPages: 1
  });

  // Tải danh mục loại tài liệu phục vụ bộ lọc
  useEffect(() => {
    documentTypesApi
      .getAll()
      .then((res) => {
        if (res.data?.data) {
          setDocTypes(res.data.data);
        }
      })
      .catch((err) => console.error('Lỗi khi tải danh mục loại tài liệu:', err));
  }, []);

  // Tải danh sách documents từ backend API có truyền search và pagination
  const fetchDocuments = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await documentsApi.getAll({
        page,
        limit,
        search: debouncedSearch,
        documentTypeId: docTypeFilter
      });
      if (res.data?.data) {
        setDocs(res.data.data);
      }
      if (res.data?.pagination) {
        setPagination(res.data.pagination);
      }
    } catch (err) {
      console.error('Lỗi khi lấy danh sách tài liệu:', err);
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, debouncedSearch, docTypeFilter]);

  // Reset page về 1 khi người dùng đổi từ khóa tìm kiếm hoặc loại tài liệu
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, docTypeFilter]);

  useEffect(() => {
    if (viewMode === 'list') {
      fetchDocuments();
    }
  }, [fetchDocuments, viewMode]);

  const handleDelete = async (id: string, title: string) => {
    try {
      await documentsApi.delete(id);
      setDocs((prev) => prev.filter((d) => d.id !== id));
      notify.info(`Đã xóa tài liệu "${title}"`);
    } catch (err) {
      console.error('Lỗi xóa tài liệu:', err);
      notify.error('Không thể xóa tài liệu. Vui lòng thử lại sau.');
    }
  };

  // Xuất file bảng kê tất cả tài liệu từ BE
  const handleExportAll = async () => {
    if (docs.length === 0) {
      notify.warning('Chưa có tài liệu nào để xuất file!');
      return;
    }
    setIsExportingAll(true);
    try {
      notify.info('Đang kết nối BE để xuất danh mục hồ sơ...');
      const response = await documentsApi.exportPackage({
        documentTypeId: 'all_docs',
        documentTypeName: 'Hồ sơ tổng hợp các loại chứng từ',
        documentTypeCode: 'ALL_DOCS',
        format: 'excel',
        imageFiles: docs.map((d) => ({
          name: d.fileName || d.title,
          sizeFormatted: d.size,
          source: d.source
        }))
      });

      const blob = new Blob([response.data as BlobPart], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Bang_Ke_Ho_So_Chung_Tu_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      notify.success('Đã tải xuống thành công tệp bảng kê hồ sơ từ máy chủ!');
    } catch (err) {
      console.error('Lỗi khi xuất bảng kê:', err);
      notify.error('Không thể xuất file từ máy chủ.');
    } finally {
      setIsExportingAll(false);
    }
  };

  // Xuất từng tài liệu riêng biệt dạng PDF từ BE
  const handleExportSingleDoc = async (doc: UploadedDocument) => {
    try {
      notify.info(`Đang yêu cầu máy chủ xuất tệp hồ sơ "${doc.title}"...`);
      const response = await documentsApi.exportPackage({
        documentTypeId: doc.documentTypeId,
        documentTypeName: doc.documentTypeName || doc.category,
        imageFiles: [
          {
            name: doc.fileName || doc.title,
            sizeFormatted: doc.size,
            source: doc.source
          }
        ],
        format: 'pdf'
      });

      const blob = new Blob([response.data as BlobPart], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Ho_So_${doc.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      notify.success(`Đã tải về tệp hồ sơ "${doc.title}" từ máy chủ`);
    } catch (err) {
      console.error('Lỗi xuất tài liệu:', err);
      notify.error('Không thể tải tệp từ máy chủ.');
    }
  };

  const getSourceBadge = (source?: 'computer' | 'device' | 'camera') => {
    switch (source) {
      case 'camera':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
            <Camera className="w-3 h-3" />
            <span>Camera Chụp Trực Tiếp</span>
          </span>
        );
      case 'device':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Smartphone className="w-3 h-3" />
            <span>Thư Viện ĐT</span>
          </span>
        );
      case 'computer':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
            <Laptop className="w-3 h-3" />
            <span>Máy Tính</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Kho Tài Liệu & Hồ Sơ Nghiệp Vụ (Nhóm DOC)
            </h2>
            <p className="text-xs text-slate-500">
              Trang được bảo vệ bởi Route Guard với mã quyền{' '}
              <code className="font-mono text-amber-600 font-semibold">DOC_VIEW</code> (Bảng DB Group 5: DOC)
            </p>
          </div>
        </div>

        {/* Nút Chuyển Đổi View */}
        <div className="flex items-center gap-2">
          {viewMode === 'upload' ? (
            <button
              type="button"
              id="btn-back-to-doc-list"
              onClick={() => {
                setViewMode('list');
                fetchDocuments();
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Quay Lại Danh Sách</span>
            </button>
          ) : (
            <Can
              do="DOC_CREATE"
              fallback={
                <button
                  type="button"
                  disabled
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium bg-slate-100 text-slate-400 cursor-not-allowed"
                  title="Yêu cầu quyền DOC_CREATE"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Tải Lên (Bị Khóa)</span>
                </button>
              }
            >
              <button
                type="button"
                id="btn-open-upload-screen"
                onClick={() => setViewMode('upload')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm hover:shadow-indigo-500/20 active:scale-95 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Upload Hình Ảnh Nghiệp Vụ</span>
              </button>
            </Can>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {viewMode === 'upload' ? (
        /* GIAO DIỆN UPLOAD HÌNH ẢNH */
        <div className="space-y-4">
          <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-indigo-900 text-xs">
              <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>
              <span>
                Đang ở chế độ: <strong>Tải lên & Chụp ảnh chứng từ theo Loại tài liệu</strong>
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setViewMode('list');
                fetchDocuments();
              }}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
            >
              Đóng form
            </button>
          </div>

          <BatchImageUploader
            onUploadComplete={(_newDocs) => {
              // Tải lại danh sách tài liệu trong nền để đồng bộ dữ liệu
              fetchDocuments();
            }}
            onCancel={() => {
              setViewMode('list');
              fetchDocuments();
            }}
          />
        </div>
      ) : (
        /* GIAO DIỆN DANH SÁCH TÀI LIỆU */
        <div className="space-y-4">
          {/* Thanh Tìm Kiếm Máy Chủ & Bộ Lọc Loại Tài Liệu */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="input-server-search-documents"
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Tìm kiếm máy chủ theo tiêu đề, danh mục, file..."
                className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
              {isLoading && (
                <Loader2 className="w-3.5 h-3.5 text-indigo-500 animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                id="select-doctype-filter"
                value={docTypeFilter}
                onChange={(e) => setDocTypeFilter(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 max-w-[220px]"
              >
                <option value="all">Tất cả loại tài liệu</option>
                {docTypes.map((dt) => (
                  <option key={dt.id} value={dt.id}>
                    {dt.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            {/* Header danh sách */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-slate-500" />
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Hồ sơ & Tài liệu trên máy chủ ({pagination.total})
                </h3>
              </div>

              <div className="flex items-center gap-2">
                {docs.length > 0 && (
                  <button
                    type="button"
                    id="btn-export-all-documents"
                    onClick={handleExportAll}
                    disabled={isExportingAll}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors disabled:opacity-50"
                    title="Xuất bảng kê toàn bộ hồ sơ dạng Excel từ máy chủ"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>{isExportingAll ? 'Đang Xuất...' : 'Xuất Bảng Kê (Excel)'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={fetchDocuments}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                  title="Làm mới danh sách"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {isLoading && docs.length === 0 ? (
              <div className="py-16 text-center text-xs text-slate-500">Đang tải tài liệu từ máy chủ...</div>
            ) : docs.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-3">
                <ImageIcon className="w-12 h-12 mx-auto text-slate-300" />
                <p className="text-xs font-medium text-slate-600">Không tìm thấy tài liệu nào phù hợp trên máy chủ</p>
                <p className="text-[11px] text-slate-400">
                  Bấm &quot;Upload Hình Ảnh Nghiệp Vụ&quot; ở góc trên để bắt đầu tải lên hoặc chụp ảnh chứng từ.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {docs.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors text-xs"
                  >
                    <div className="flex items-start gap-3.5 min-w-0">
                      {/* Thumbnail hoặc Icon */}
                      {doc.thumbnailUrl ? (
                        <div
                          className="w-12 h-12 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shrink-0 cursor-pointer group relative shadow-2xs"
                          onClick={() => setActiveZoomImage(doc.fileUrl || doc.thumbnailUrl || null)}
                          title="Click để phóng to ảnh"
                        >
                          <img
                            src={doc.thumbnailUrl}
                            alt={doc.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
                          />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                            <Eye className="w-3.5 h-3.5" />
                          </div>
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 border border-amber-100 flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                      )}

                      {/* Metadata thông tin */}
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold text-slate-900 truncate" title={doc.title}>
                            {doc.title}
                          </h4>
                          {doc.source && getSourceBadge(doc.source)}
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-slate-400 flex-wrap">
                          <span className="font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                            {doc.documentTypeName || doc.category}
                          </span>
                          <span>•</span>
                          <span>{doc.size}</span>
                          <span>•</span>
                          <span>{doc.date}</span>
                          {doc.uploadedBy && (
                            <>
                              <span>•</span>
                              <span className="text-slate-500">Bởi: {doc.uploadedBy}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                      {/* Xem ảnh lớn */}
                      {(doc.fileUrl || doc.thumbnailUrl) && (
                        <button
                          type="button"
                          onClick={() => setActiveZoomImage(doc.fileUrl || doc.thumbnailUrl || null)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-600 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 border border-transparent hover:border-indigo-100 transition-colors"
                          title="Xem ảnh chi tiết"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Xem</span>
                        </button>
                      )}

                      {/* Xuất file từ BE */}
                      <button
                        type="button"
                        onClick={() => handleExportSingleDoc(doc)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-emerald-700 hover:text-emerald-800 rounded-lg hover:bg-emerald-50 border border-transparent hover:border-emerald-100 transition-colors"
                        title="Xuất file hồ sơ điện tử từ máy chủ"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Xuất File</span>
                      </button>

                      {/* Quyền xóa tài liệu DOC_REMOVE */}
                      <Can do="DOC_REMOVE">
                        <button
                          type="button"
                          onClick={() => handleDelete(doc.id, doc.title)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                          title="Xóa tài liệu (DOC_REMOVE)"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </Can>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Phân trang máy chủ (Server Pagination) */}
            <Pagination
              page={pagination.page}
              limit={pagination.limit}
              total={pagination.total}
              totalPages={pagination.totalPages}
              onPageChange={(newPage) => setPage(newPage)}
              onLimitChange={(newLimit) => {
                setLimit(newLimit);
                setPage(1);
              }}
              itemName="tài liệu"
              isLoading={isLoading}
            />
          </div>
        </div>
      )}

      {/* Lightbox Xem Phóng To Hình Ảnh */}
      {activeZoomImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in"
          onClick={() => setActiveZoomImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl">
            <button
              type="button"
              onClick={() => setActiveZoomImage(null)}
              className="absolute top-3 right-3 p-2 rounded-full bg-black/60 text-white hover:bg-black/90 transition-colors z-10"
              title="Đóng"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={activeZoomImage}
              alt="Xem tài liệu"
              className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export const DocumentsPage = withAuthorization(DocumentsPageComponent, 'DOC_VIEW');
export default DocumentsPage;
