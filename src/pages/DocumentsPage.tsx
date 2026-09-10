import React, { useState, useEffect } from "react";
import { FileText, RefreshCw, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Can from "../components/guards/Can";
import withAuthorization from "../components/guards/withAuthorization";
import Pagination from "../components/common/Pagination";
import { useDocuments, useDocumentTypes } from "../hooks/useApiQueries";

const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("vi-VN");
};

const DocumentsPageComponent: React.FC = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    page: 1,
    page_size: 10,
    document_type_id: "",
    search: "",
  });
  const [searchInput, setSearchInput] = useState("");
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const search = searchInput.trim();
      // Apply the search and reset pagination together, avoiding a request for the old page.
      setFilters((previous) =>
        previous.search === search
          ? previous
          : { ...previous, search, page: 1 },
      );
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);
  const documentTypes = useDocumentTypes();
  const { data, isPending, isFetching, isError, refetch } =
    useDocuments(filters);
  const documents = data?.documents ?? [];

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Kho Tài Liệu</h1>
            <p className="text-sm text-slate-500">
              Danh sách hồ sơ và trạng thái xử lý.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Can do="DOC_CREATE">
            <button
              type="button"
              onClick={() => navigate("/documents/new")}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl"
            >
              <Plus className="w-4 h-4" />
              Tạo hồ sơ
            </button>
          </Can>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            aria-label="Làm mới danh sách tài liệu"
            className="p-2 text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl disabled:opacity-50"
          >
            <RefreshCw
              className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`}
            />
          </button>
        </div>
      </header>
      <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="document-search"
            className="block text-sm font-medium text-slate-700"
          >
            Tìm hồ sơ
          </label>
          <input
            id="document-search"
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Nhập tên hồ sơ hoặc tên nhóm tài liệu..."
            className="w-full mt-1 px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label
            htmlFor="document-type-select"
            className="block text-sm font-medium text-slate-700"
          >
            Loại tài liệu
          </label>
          <select
            id="document-type-select"
            value={filters.document_type_id}
            onChange={(e) =>
              setFilters((previous) => ({
                ...previous,
                document_type_id: e.target.value,
                page: 1,
              }))
            }
            disabled={documentTypes.isPending || documentTypes.isError}
            className="w-full mt-1 px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            <option value="">
              {documentTypes.isPending
                ? "Đang tải loại tài liệu..."
                : "Tất cả loại tài liệu"}
            </option>
            {documentTypes.data?.items.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name} ({type.code})
                {type.is_active ? "" : " — Ngừng hoạt động"}
              </option>
            ))}
          </select>
          {documentTypes.isError && (
            <p role="alert" className="text-sm text-red-600">
              Không thể tải loại tài liệu.{" "}
              <button
                type="button"
                onClick={() => documentTypes.refetch()}
                disabled={documentTypes.isFetching}
                className="underline"
              >
                Tải lại loại tài liệu
              </button>
            </p>
          )}
          {documentTypes.isSuccess && documentTypes.data.items.length === 0 && (
            <p className="text-sm text-slate-500">Chưa có loại tài liệu.</p>
          )}
        </div>
      </div>
      <section
        className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden"
        aria-label="Danh sách tài liệu"
      >
        {isPending ? (
          <p role="status" className="py-16 text-center text-sm text-slate-500">
            Đang tải danh sách tài liệu...
          </p>
        ) : isError ? (
          <div role="alert" className="p-8 text-center text-sm text-red-600">
            Không thể tải danh sách tài liệu.{" "}
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              className="underline"
            >
              Thử lại
            </button>
          </div>
        ) : documents.length === 0 ? (
          <p className="py-16 text-center text-sm text-slate-500">
            {filters.search || filters.document_type_id
              ? "Không tìm thấy hồ sơ phù hợp."
              : "Chưa có tài liệu."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                <tr>
                  {[
                    "Tiêu đề",
                    "Trạng thái",
                    "Task",
                    "Template",
                    "Thông tin tạo",
                    "Cập nhật gần nhất",
                  ].map((title) => (
                    <th
                      key={title}
                      scope="col"
                      className="px-5 py-4 whitespace-nowrap"
                    >
                      {title}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-4 min-w-52">
                      <button
                        type="button"
                        onClick={() =>
                          navigate(`/documents/${encodeURIComponent(doc.id)}`)
                        }
                        className="font-semibold text-left text-indigo-700 hover:underline"
                      >
                        {doc.title}
                      </button>
                      <span className="block mt-1 text-[10px] text-slate-400 font-mono">
                        {doc.id}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-block px-2 py-1 rounded-full bg-slate-100 text-slate-700 whitespace-nowrap">
                        {doc.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-mono whitespace-nowrap">
                      {doc.task_id}
                    </td>
                    <td className="px-5 py-4 font-mono whitespace-nowrap">
                      {doc.template_id}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <time dateTime={doc.created_at}>
                        {formatDate(doc.created_at)}
                      </time>
                      <span className="block mt-1 text-[10px] text-slate-400 font-mono">
                        {doc.created_by}
                      </span>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <time dateTime={doc.updated_at}>
                        {formatDate(doc.updated_at)}
                      </time>
                      <span className="block mt-1 text-[10px] text-slate-400 font-mono">
                        {doc.updated_by}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!isError && data && (
          <Pagination
            page={data.pagination.page}
            limit={data.pagination.limit}
            total={data.pagination.total}
            totalPages={data.pagination.totalPages}
            onPageChange={(page) =>
              setFilters((previous) => ({ ...previous, page }))
            }
            onLimitChange={(size) =>
              setFilters((previous) => ({
                ...previous,
                page_size: size,
                page: 1,
              }))
            }
            itemName="tài liệu"
            isLoading={isFetching}
          />
        )}
      </section>
    </div>
  );
};

export const DocumentsPage = withAuthorization(
  DocumentsPageComponent,
  "DOC_VIEW",
);
export default DocumentsPage;
