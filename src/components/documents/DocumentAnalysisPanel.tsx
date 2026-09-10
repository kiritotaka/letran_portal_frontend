import React from 'react';
import { Loader2, ScanText } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useDocumentAnalysis } from '../../hooks/useDocumentAnalysis';
import { emptyReviewValue, useDocumentReview } from '../../hooks/useDocumentReview';
import type { DocumentRequest } from '../../types';
import type { RequestFileLink } from '../../services/documentWorkflowTypes';
import type { AnalysisJob } from '../../services/documentAnalysisApi';

const FIELD_LABELS: Record<string, string> = {
  acceptance_date: 'Ngày nghiệm thu',
  acceptance_place: 'Địa điểm nghiệm thu',
  acceptance_statement: 'Nội dung nghiệm thu',
  actual_start_date: 'Ngày bắt đầu thực tế',
  actual_end_date: 'Ngày kết thúc thực tế',
  contract_date: 'Ngày hợp đồng',
  contract_number: 'Số hợp đồng',
  contract_total: 'Tổng giá trị hợp đồng',
  copy_count: 'Tổng số bản',
  copies_per_party: 'Số bản mỗi bên giữ',
  paid_amount: 'Số tiền đã thanh toán',
  remaining_amount: 'Số tiền còn lại',
  party_a_name: 'Tên bên A',
  party_a_address: 'Địa chỉ bên A',
  party_a_phone: 'Điện thoại bên A',
  party_a_representative: 'Người đại diện bên A',
  party_a_position: 'Chức vụ đại diện bên A',
  party_b_name: 'Tên bên B',
  party_b_address: 'Địa chỉ bên B',
  party_b_phone: 'Điện thoại bên B',
  party_b_representative: 'Người đại diện bên B',
  party_b_position: 'Chức vụ đại diện bên B',
  service_description: 'Nội dung dịch vụ',
  service_quality: 'Chất lượng dịch vụ',
};
const fieldLabels: Record<string, string> = {
  extracted: 'Đã trích xuất · Cần kiểm tra', missing: 'Không tìm thấy', needs_input: 'Cần bổ sung', conflict: 'Thông tin mâu thuẫn · Kiểm tra nguồn',
};
export function analysisStep(job: AnalysisJob) {
  if (job.status === 'completed') return 'Đã phân tích, vui lòng kiểm tra';
  if (job.status === 'failed') return 'Phân tích thất bại';
  if (job.status === 'queued') return 'Đang chờ xử lý…';
  return ({ reading_sources: 'Đang đọc tài liệu…', analyzing: 'AI đang phân tích…', validating: 'Đang kiểm tra dữ liệu…' }[job.stage] || 'Đang xử lý…');
}
const renderValue = (value: unknown) => value === null || value === undefined ? 'Chưa có'
  : typeof value === 'object' ? JSON.stringify(value) : String(value);

export default function DocumentAnalysisPanel({ requestId, request, files, inputsReady }: {
  requestId: string; request?: DocumentRequest; files: RequestFileLink[]; inputsReady: boolean;
}) {
  const { user, hasPermission } = useAuth();
  const canAnalyze = hasPermission('DOC_UPDATE');
  const analysis = useDocumentAnalysis(requestId, user?.id ?? '');
  const review = useDocumentReview(requestId, analysis.job, canAnalyze && !analysis.creating && !analysis.running, user?.id ?? '');
  const hasUploaded = files.some((entry) => ['uploaded', 'ready'].includes(entry.file.status));
  const uploading = files.some((entry) => entry.file.status === 'uploading');
  const reason = !inputsReady ? 'Đang chờ thông tin hồ sơ và file được tải đầy đủ.'
    : request?.status !== 'draft' ? 'Chỉ có thể phân tích hồ sơ ở trạng thái draft.'
    : uploading ? 'Vui lòng chờ tất cả file upload xong.'
    : !hasUploaded ? 'Cần ít nhất một file upload thành công để phân tích.' : '';
  const disabled = !canAnalyze || Boolean(reason) || analysis.loading || !analysis.historyReady || analysis.creating || analysis.running || review.busy;
  const job = analysis.job;
  const result = job?.status === 'completed' ? job.extracted_data : null;
  const fields = result?.fields ?? [];
  const missingNames = (result?.missing_fields ?? []).filter((name) => !fields.some((field) => field.name === name));
  const reviewStatus = (name: string) => Object.prototype.hasOwnProperty.call(review.edits, name)
    ? emptyReviewValue(review.edits[name]) ? 'Cần bổ sung' : 'Đã nhập · Chưa lưu'
    : review.review?.fields.some((field) => field.name === name && !emptyReviewValue(field.value)) ? 'Đã lưu' : null;
  const renderField = (name: string, raw: unknown, display: unknown, needsInput: boolean) => {
    const value = review.value(name, raw);
    const savedField = review.review?.fields.some((field) => field.name === name);
    if (canAnalyze && (needsInput || emptyReviewValue(raw))) return <div>
      <input type="text" aria-label={FIELD_LABELS[name] || name} aria-required="true" aria-invalid={review.invalid.includes(name)}
        disabled={!review.ready || review.busy || analysis.creating || analysis.running}
        value={emptyReviewValue(value) ? '' : renderValue(value)} onChange={(event) => review.edit(name, event.target.value)}
        placeholder="Nhập thông tin còn thiếu" className="w-full min-w-40 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100" />
      {review.invalid.includes(name) && <p className="mt-1 text-xs text-red-600">Vui lòng nhập thông tin.</p>}
    </div>;
    return renderValue(savedField ? value : display ?? raw ?? 'Chưa có');
  };

  return <section aria-labelledby="analysis-title" className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 id="analysis-title" className="font-semibold text-slate-900 flex items-center gap-2"><ScanText className="w-5 h-5 text-indigo-600" />Kết quả phân tích</h2>
      {canAnalyze && <button type="button" disabled={disabled} onClick={() => {
        if (disabled) return;
        if (Object.keys(review.edits).length && !window.confirm('Phân tích lại sẽ bỏ các thông tin bạn chưa lưu. Tiếp tục?')) return;
        void analysis.create();
      }}
        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl disabled:opacity-50">
        {analysis.creating ? 'Đang gửi yêu cầu…' : analysis.running ? 'Đang phân tích…' : analysis.postError ? 'Thử lại yêu cầu phân tích' : job ? 'Phân tích lại' : 'Phân tích tài liệu'}
      </button>}
    </div>
    {canAnalyze && reason && !analysis.running && <p className="text-sm text-slate-500">{reason}</p>}
    {analysis.loading && <p role="status" className="text-sm text-slate-500">Đang tải lịch sử phân tích…</p>}
    {analysis.error && <p role="alert" className="text-sm text-red-600">{analysis.error} <button type="button" disabled={analysis.creating || analysis.loading} onClick={() => analysis.reload()} className="underline">Tải lại lịch sử phân tích</button></p>}
    {analysis.postError && <p role="alert" className="text-sm text-red-600">{analysis.postError} Thử lại sẽ dùng cùng mã yêu cầu, tránh tạo trùng.</p>}
    {!analysis.loading && analysis.historyReady && !job && !analysis.creating && <p className="text-sm text-slate-500">Hồ sơ chưa có lần phân tích nào.</p>}
    {job && <div>
      <p role="status" aria-live="polite" className={`flex items-center gap-2 text-sm font-medium ${job.status === 'failed' ? 'text-red-600' : 'text-indigo-700'}`}>
        {analysis.running && <Loader2 className="w-4 h-4 animate-spin" />}{analysisStep(job)}
      </p>
      {job.status === 'failed' && <p role="alert" className="mt-2 text-sm text-red-600">{job.error_code || 'Máy chủ chưa cung cấp mã lỗi.'}</p>}
    </div>}
    {job?.status === 'completed' && <>
      <p className="text-sm text-amber-800 bg-amber-50 p-3 rounded-xl">Đây là dữ liệu nháp do AI đọc. Vui lòng đối chiếu tài liệu nguồn trước khi sử dụng.</p>
      {!result && <p className="text-sm text-slate-500">Lần phân tích này chưa có dữ liệu trích xuất được trả về.</p>}
      {result && <>
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600"><tr>{['Trường', 'Giá trị AI đọc được', 'Trạng thái', 'Nguồn'].map((label) => <th key={label} scope="col" className="p-3">{label}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">{fields.map((field, index) => {
              const status = field.conflict ? 'conflict' : field.status;
              return <tr key={`${field.name}-${index}`}>
                <th scope="row" className="p-3 font-medium text-slate-800">{FIELD_LABELS[field.name] || field.name}</th>
                <td className="p-3 whitespace-pre-wrap break-words max-w-md">{renderField(field.name, field.value, field.display_value,
                  ['missing', 'needs_input', 'conflict'].includes(status) || (result.missing_fields ?? []).includes(field.name))}</td>
                <td className={`p-3 ${status === 'extracted' ? 'text-emerald-700' : 'text-amber-800'}`}>{reviewStatus(field.name) || fieldLabels[status] || status}</td>
                <td className="p-3">{field.sources?.length ? <details>
                  <summary className="cursor-pointer text-indigo-700">Nguồn ({field.sources.length})</summary>
                  <ul className="space-y-3 mt-2">{field.sources.map((source, i) => <li key={`${source.file_id}-${i}`} className="text-xs space-y-1">
                    <p className="font-medium break-all">{job.source_snapshot?.find((file) => file.file_id === source.file_id)?.original_name || source.file_id}</p>
                    <p className="text-slate-500">{source.location}</p><blockquote className="border-l-2 border-indigo-200 pl-2 whitespace-pre-wrap">{source.quote}</blockquote>
                  </li>)}</ul>
                </details> : <span className="text-slate-400">Chưa có nguồn</span>}</td>
              </tr>;
            })}
            {missingNames.map((name) => <tr key={name}><th scope="row" className="p-3 font-medium">{FIELD_LABELS[name] || name}</th><td className="p-3">{renderField(name, null, null, true)}</td><td className="p-3 text-amber-800">{reviewStatus(name) || 'Không tìm thấy'}</td><td className="p-3 text-slate-400">Chưa có nguồn</td></tr>)}
            {!fields.length && !missingNames.length && <tr><td colSpan={4} className="p-4 text-slate-500 text-center">Không có trường dữ liệu được trả về.</td></tr>}
            </tbody>
          </table>
        </div>
        {result.warnings?.length > 0 && <div className="text-sm text-amber-800"><p className="font-semibold">Lưu ý từ lần phân tích</p><ul className="list-disc pl-5">{result.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul></div>}
        {!review.ready && !review.error && <p role="status" className="text-sm text-slate-500">Đang tải dữ liệu đã lưu…</p>}
        {review.error && <p role="alert" className="text-sm text-red-600">{review.error}</p>}
        {!review.ready && review.error && <button type="button" onClick={review.reload} disabled={review.busy} className="text-sm text-indigo-700 underline">Tải lại dữ liệu đã lưu</button>}
        {review.message && <p role="status" className="text-sm text-indigo-700">{review.message}</p>}
        {review.review && <p className="text-xs text-slate-500">Phiên bản đã lưu: {review.review.revision} · {review.saved ? 'Đã xác nhận' : 'Có thông tin cần xác nhận'}</p>}
        {canAnalyze && review.ready && <div className="space-y-3 border-t border-slate-100 pt-4">
          {!review.saved && <label className="flex items-start gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={review.confirmed} disabled={review.busy || analysis.creating}
              onChange={(event) => review.setConfirmed(event.target.checked)} className="mt-1" />
            Tôi đã kiểm tra và xác nhận thông tin để xuất tài liệu.
          </label>}
          {review.saved && review.fileError && <button type="button" disabled={review.busy || analysis.creating || analysis.running}
            onClick={() => void review.run(true)} className="mr-2 px-4 py-2 rounded-xl border border-indigo-200 text-indigo-700 text-sm disabled:opacity-50">Thử lại tạo file</button>}
          {review.saved ? <button type="button" disabled={review.busy || review.fileError || analysis.creating || analysis.running}
            onClick={() => void review.run(false)} className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold disabled:opacity-50">
            {review.busy ? 'Đang chuẩn bị file…' : 'Xuất file'}
          </button> : <button type="button" disabled={review.busy || analysis.creating || analysis.running}
            onClick={() => void review.run(true)} className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold disabled:opacity-50">
            {review.busy ? 'Đang lưu thông tin…' : 'Lưu thông tin'}
          </button>}
        </div>}
      </>}
    </>}
  </section>;
}
