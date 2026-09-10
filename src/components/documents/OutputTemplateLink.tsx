import React, { useEffect, useRef, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { documentRequestApi } from '../../services/documentRequestApi';

export default function OutputTemplateLink({ requestId, name }: { requestId: string; name?: string }) {
  const [label, setLabel] = useState(name || 'Mở file mẫu');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const opened = useRef<Window | null>(null);

  useEffect(() => {
    const abort = new AbortController();
    if (!name) void documentRequestApi.templateUrl(requestId, abort.signal)
      .then((data) => { if (!abort.signal.aborted) setLabel(data.name || 'Mở file mẫu'); })
      .catch(() => { /* The link remains available for a fresh attempt. */ });
    return () => { abort.abort(); controller.current?.abort(); opened.current?.close(); };
  }, [requestId, name]);

  const openTemplate = async () => {
    if (pending.current) return;
    pending.current = true;
    setLoading(true);
    setError('');
    // Open during the click so the browser does not block the async navigation.
    const tab = window.open('about:blank', '_blank');
    if (tab) tab.opener = null;
    opened.current = tab;
    const abort = new AbortController();
    controller.current = abort;
    try {
      const data = await documentRequestApi.templateUrl(requestId, abort.signal);
      if (abort.signal.aborted) return;
      const url = new URL(data.url);
      if (!['https:', 'http:'].includes(url.protocol)) throw new Error('Invalid template URL');
      setLabel(data.name || label);
      if (tab && !tab.closed) tab.location.replace(url.href);
      else window.location.assign(url.href);
      opened.current = null;
    } catch {
      tab?.close();
      if (!abort.signal.aborted) setError('Không thể mở file mẫu. Vui lòng bấm vào tên mẫu để thử lại.');
    } finally {
      pending.current = false;
      if (!abort.signal.aborted) setLoading(false);
    }
  };

  return <>
    <button type="button" onClick={() => void openTemplate()} disabled={loading}
      title="Mở hoặc tải file mẫu" className="inline-flex items-center gap-1 text-indigo-600 underline text-left hover:text-indigo-800 disabled:opacity-50">
      {loading ? 'Đang mở file mẫu…' : label}<ExternalLink className="w-3.5 h-3.5 shrink-0" />
    </button>
    {error && <p role="alert" className="mt-1 text-sm text-red-600">{error}</p>}
  </>;
}
