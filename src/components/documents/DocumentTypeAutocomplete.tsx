import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, Check, FileSpreadsheet, FileText, Download, X, AlertCircle } from 'lucide-react';
import { DocumentType } from '../../types';
import { documentTypesApi } from '../../services/api';

interface DocumentTypeAutocompleteProps {
  selectedDocType: DocumentType | null;
  onSelect: (docType: DocumentType | null) => void;
  disabled?: boolean;
}

export const DocumentTypeAutocomplete: React.FC<DocumentTypeAutocompleteProps> = ({
  selectedDocType,
  onSelect,
  disabled = false
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [docTypes, setDocTypes] = useState<DocumentType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load danh sách loại tài liệu từ API
  useEffect(() => {
    let isMounted = true;
    const fetchDocTypes = async () => {
      setIsLoading(true);
      try {
        const res = await documentTypesApi.getAll();
        if (isMounted && res.data) {
          setDocTypes(res.data);
        }
      } catch (err) {
        console.error('Lỗi khi tải danh sách loại tài liệu:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    fetchDocTypes();
    return () => {
      isMounted = false;
    };
  }, []);

  // Xử lý click outside để đóng dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Lọc theo query (không dấu/có dấu)
  const filteredDocTypes = docTypes.filter((dt) => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    return (
      dt.name.toLowerCase().includes(q) ||
      dt.code.toLowerCase().includes(q) ||
      dt.category.toLowerCase().includes(q) ||
      dt.description.toLowerCase().includes(q)
    );
  });

  const getTemplateIcon = (type: 'excel' | 'docx' | 'pdf') => {
    switch (type) {
      case 'excel':
        return <FileSpreadsheet className="w-4 h-4 text-emerald-600" />;
      case 'docx':
        return <FileText className="w-4 h-4 text-indigo-600" />;
      case 'pdf':
        return <FileText className="w-4 h-4 text-rose-600" />;
      default:
        return <FileText className="w-4 h-4 text-slate-600" />;
    }
  };

  const getTemplateBadgeColor = (type: 'excel' | 'docx' | 'pdf') => {
    switch (type) {
      case 'excel':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'docx':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'pdf':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-3" ref={dropdownRef}>
      <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
        1. Chọn Loại Tài Liệu Nghiệp Vụ <span className="text-rose-500">*</span>
      </label>

      {/* Autocomplete Input */}
      <div className="relative">
        <div className="relative flex items-center">
          <div className="absolute left-3.5 text-slate-400 pointer-events-none">
            <Search className="w-4 h-4" />
          </div>

          <input
            ref={inputRef}
            type="text"
            id="input-document-type-autocomplete"
            value={isOpen ? query : (selectedDocType ? selectedDocType.name : query)}
            onChange={(e) => {
              setQuery(e.target.value);
              if (!isOpen) setIsOpen(true);
            }}
            onFocus={() => {
              setIsOpen(true);
              setQuery('');
            }}
            disabled={disabled}
            placeholder="Nhập tên hoặc mã loại tài liệu (VD: Hợp đồng, Hóa đơn, BB_NT...)"
            className={`w-full pl-10 pr-10 py-2.5 rounded-xl border text-xs text-slate-900 bg-white placeholder:text-slate-400 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 ${
              selectedDocType ? 'border-indigo-300 font-medium' : 'border-slate-200'
            } ${disabled ? 'bg-slate-50 cursor-not-allowed text-slate-400' : ''}`}
          />

          <div className="absolute right-3 flex items-center gap-1">
            {selectedDocType && !disabled && (
              <button
                type="button"
                id="btn-clear-doctype-selection"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(null);
                  setQuery('');
                  inputRef.current?.focus();
                }}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors"
                title="Bỏ chọn"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              id="btn-toggle-doctype-dropdown"
              onClick={() => {
                if (!disabled) setIsOpen(!isOpen);
              }}
              className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        {/* Dropdown menu */}
        {isOpen && !disabled && (
          <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-2xl border border-slate-200 shadow-xl z-50 max-h-72 overflow-y-auto divide-y divide-slate-100">
            {isLoading ? (
              <div className="p-4 text-center text-xs text-slate-400">Đang tải danh mục tài liệu...</div>
            ) : filteredDocTypes.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500 flex flex-col items-center gap-1">
                <AlertCircle className="w-4 h-4 text-slate-400" />
                <span>Không tìm thấy loại tài liệu phù hợp với &quot;{query}&quot;</span>
              </div>
            ) : (
              filteredDocTypes.map((dt) => {
                const isSelected = selectedDocType?.id === dt.id;
                return (
                  <button
                    key={dt.id}
                    type="button"
                    onClick={() => {
                      onSelect(dt);
                      setIsOpen(false);
                      setQuery('');
                    }}
                    className={`w-full text-left p-3.5 flex items-start justify-between gap-3 transition-colors ${
                      isSelected ? 'bg-indigo-50/70 text-indigo-900' : 'hover:bg-slate-50 text-slate-800'
                    }`}
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-xs text-slate-900">{dt.name}</span>
                        <code className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                          {dt.code}
                        </code>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                          {dt.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-1">{dt.description}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-center">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded font-mono font-medium border ${getTemplateBadgeColor(
                          dt.template_type
                        )}`}
                      >
                        {getTemplateIcon(dt.template_type)}
                        <span>{dt.template_type.toUpperCase()}</span>
                      </span>
                      {isSelected && <Check className="w-4 h-4 text-indigo-600" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Thông tin loại tài liệu đã chọn & Nút tải Biểu mẫu mẫu (Template URL) */}
      {selectedDocType && (
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900">{selectedDocType.name}</span>
              <code className="text-[11px] font-mono px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 font-bold border border-indigo-200">
                {selectedDocType.code}
              </code>
            </div>
            <p className="text-xs text-slate-500">{selectedDocType.description}</p>
          </div>

          {/* Nút tải File Template Mẫu */}
          {selectedDocType.template_url && (
            <a
              id="link-download-doc-template"
              href={documentTypesApi.getTemplateDownloadUrl(selectedDocType.template_filename)}
              download={selectedDocType.template_filename}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white text-slate-700 hover:text-indigo-600 border border-slate-200 hover:border-indigo-300 shadow-2xs hover:bg-slate-50 transition-all shrink-0"
              title={`Tải về file biểu mẫu mẫu: ${selectedDocType.template_filename}`}
            >
              {getTemplateIcon(selectedDocType.template_type)}
              <div className="text-left">
                <div className="flex items-center gap-1 font-semibold text-slate-800">
                  <Download className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Tải Biểu Mẫu Chuẩn ({selectedDocType.template_type.toUpperCase()})</span>
                </div>
                <div className="text-[10px] text-slate-400 font-normal font-mono">
                  {selectedDocType.template_filename} ({selectedDocType.template_size})
                </div>
              </div>
            </a>
          )}
        </div>
      )}
    </div>
  );
};

export default DocumentTypeAutocomplete;
