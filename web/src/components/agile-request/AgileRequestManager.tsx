import React, { useState, useEffect, useMemo } from 'react';
import {
  Send,
  History,
  Upload,
  RotateCcw,
  Code2,
  Copy,
  Check,
  Trash2,
  Search,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  FileJson,
  Sparkles,
  Loader2
} from 'lucide-react';
import { AgileMethod, AgileRequestLog } from '../../types';
import { api } from '../../api/client';

const methodList: AgileMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

const defaultHeaders = '{\n  "Content-Type": "application/json"\n}';
const defaultBody = '{\n  \n}';

const getMethodColor = (m: string) => {
  switch (m) {
    case 'GET':
      return 'text-sky-400 bg-sky-500/10 border-sky-500/30';
    case 'POST':
      return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
    case 'PUT':
      return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
    case 'DELETE':
      return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
    case 'PATCH':
      return 'text-purple-400 bg-purple-500/10 border-purple-500/30';
    default:
      return 'text-zinc-400 bg-zinc-500/10 border-zinc-500/30';
  }
};

const tryFormatJson = (value: string) => {
  const text = value.trim();
  if (!text) return '';
  return JSON.stringify(JSON.parse(text), null, 2);
};

const formatMaybeJson = (value: string) => {
  try {
    return tryFormatJson(value);
  } catch {
    return value;
  }
};

const formatSize = (value: string) => {
  const bytes = new Blob([value || '']).size;
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
};

const parseFetchImport = (source: string) => {
  const text = source.trim();
  const matched = text.match(/^fetch\(\s*(["'`])([\s\S]*?)\1\s*(?:,\s*([\s\S]*?)\s*)?\)\s*;?\s*$/);
  if (!matched) {
    throw new Error('请粘贴浏览器 Network 面板 Copy as fetch 的完整代码');
  }

  const requestUrl = matched[2].trim();
  const rawOptions = (matched[3] || '').trim();
  if (!rawOptions) {
    return {
      method: 'GET' as AgileMethod,
      url: requestUrl,
      headersJson: '{}',
      body: '',
    };
  }

  let options: any;
  try {
    options = JSON.parse(rawOptions);
  } catch {
    throw new Error('暂只支持 Chrome 默认 Copy as fetch 生成的 JSON options 格式');
  }

  const nextMethod = (options.method || (options.body ? 'POST' : 'GET')).toUpperCase();

  let nextBody = '';
  if (typeof options.body === 'string') {
    nextBody = formatMaybeJson(options.body);
  } else if (typeof options.body !== 'undefined' && options.body !== null) {
    nextBody = JSON.stringify(options.body, null, 2);
  }

  return {
    method: (methodList.includes(nextMethod as AgileMethod) ? nextMethod : 'POST') as AgileMethod,
    url: requestUrl,
    headersJson: JSON.stringify(options.headers || {}, null, 2),
    body: nextBody,
  };
};

export const AgileRequestManager: React.FC = () => {
  const [method, setMethod] = useState<AgileMethod>('POST');
  const [url, setUrl] = useState('');
  const [headersJson, setHeadersJson] = useState(defaultHeaders);
  const [body, setBody] = useState(defaultBody);
  const [activeResponseTab, setActiveResponseTab] = useState<'json' | 'headers' | 'raw'>('json');

  const [history, setHistory] = useState<AgileRequestLog[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyKeyword, setHistoryKeyword] = useState('');
  const [historyMethod, setHistoryMethod] = useState<string>('');
  const [historyLoading, setHistoryLoading] = useState(false);

  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState('');

  const [sending, setSending] = useState(false);
  const [response, setResponse] = useState<AgileRequestLog | null>(null);
  const [copiedBody, setCopiedBody] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await api.getAgileRequestHistory({
        page: 1,
        page_size: 50,
        keyword: historyKeyword.trim() || undefined,
        method: historyMethod || undefined,
      });
      setHistory(res.list || []);
    } catch (err: any) {
      console.error('Failed to load history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [historyKeyword, historyMethod]);

  const handleSend = async () => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      showToast('请输入请求 URL', 'error');
      return;
    }

    let finalHeaders = '{}';
    if (headersJson.trim()) {
      try {
        finalHeaders = tryFormatJson(headersJson);
      } catch {
        showToast('Header JSON 格式错误', 'error');
        return;
      }
    }

    let finalBody = '';
    if (body.trim()) {
      try {
        finalBody = tryFormatJson(body);
      } catch {
        finalBody = body.trim();
      }
    }

    setSending(true);
    try {
      const result = await api.sendAgileRequest({
        method,
        url: trimmedUrl,
        request_headers: finalHeaders,
        request_body: finalBody,
      });
      setResponse(result);
      setActiveResponseTab('json');
      loadHistory();
      if (result.is_success === 1) {
        showToast(`请求成功 (${result.response_status}) · 耗时 ${result.duration_ms}ms`, 'success');
      } else {
        showToast(`请求响应异常: ${result.error_message || result.response_status || '未知错误'}`, 'error');
      }
    } catch (err: any) {
      showToast(err.message || '请求发送失败', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleFormatJson = (value: string, setter: (val: string) => void, fieldName: string) => {
    try {
      setter(tryFormatJson(value));
      showToast(`${fieldName} 已格式化`, 'success');
    } catch {
      showToast(`${fieldName} JSON 格式错误`, 'error');
    }
  };

  const handleLoadHistoryItem = (item: AgileRequestLog) => {
    setMethod(item.method);
    setUrl(item.url);
    setHeadersJson(formatMaybeJson(item.request_headers || '{}'));
    setBody(formatMaybeJson(item.request_body || ''));
    setResponse(item);
    setHistoryOpen(false);
    showToast(`已载入历史: [${item.method}] ${item.url}`, 'info');
  };

  const handleDeleteHistoryItem = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.deleteAgileRequestHistory(id);
      setHistory((prev) => prev.filter((h) => h.id !== id));
      showToast('历史记录已删除', 'success');
    } catch (err: any) {
      showToast('删除失败', 'error');
    }
  };

  const handleClearHistory = async () => {
    if (!window.confirm('确定要清空全部请求历史吗？')) return;
    try {
      await api.clearAgileRequestHistory();
      setHistory([]);
      showToast('历史记录已全部清空', 'success');
    } catch (err: any) {
      showToast('清空失败', 'error');
    }
  };

  const handleImportFetchSubmit = () => {
    setImportError('');
    try {
      const imported = parseFetchImport(importText);
      setMethod(imported.method);
      setUrl(imported.url);
      setHeadersJson(imported.headersJson || '{}');
      setBody(imported.body || '');
      setImportOpen(false);
      setImportText('');
      showToast('Chrome Fetch 请求已成功导入', 'success');
    } catch (err: any) {
      setImportError(err.message || '导入解析失败');
    }
  };

  const handleCopyResponseBody = async () => {
    if (!response?.response_body) return;
    await navigator.clipboard.writeText(response.response_body);
    setCopiedBody(true);
    setTimeout(() => setCopiedBody(false), 2000);
    showToast('响应内容已复制到剪贴板', 'success');
  };

  const resetAll = () => {
    setMethod('POST');
    setUrl('');
    setHeadersJson(defaultHeaders);
    setBody(defaultBody);
    setResponse(null);
    showToast('已重置请求面板', 'info');
  };

  const formattedResponseHeaders = useMemo(() => {
    return formatMaybeJson(response?.response_headers || '');
  }, [response?.response_headers]);

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-3.5rem)] bg-[#09090b] text-[#f4f4f5] overflow-hidden select-none">
      {/* Toast Notification Bar */}
      {statusMessage && (
        <div
          className={`absolute top-16 right-6 z-50 px-4 py-2 rounded-xl text-xs font-medium border shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-150 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/40'
              : statusMessage.type === 'error'
              ? 'bg-rose-950/90 text-rose-300 border-rose-500/40'
              : 'bg-zinc-900/95 text-zinc-300 border-zinc-700'
          }`}
        >
          {statusMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
          {statusMessage.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
          {statusMessage.type === 'info' && <Sparkles className="w-4 h-4 text-blue-400 shrink-0" />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Top Request Action Bar */}
      <div className="px-6 py-3.5 border-b border-[#27272a] bg-[#0d0d10] flex items-center gap-3 shrink-0">
        {/* Method Select */}
        <div className="relative">
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as AgileMethod)}
            className={`h-10 pl-3 pr-8 rounded-xl border text-xs font-bold font-mono outline-none cursor-pointer transition-all appearance-none ${getMethodColor(
              method
            )}`}
          >
            {methodList.map((m) => (
              <option key={m} value={m} className="bg-[#18181b] text-white">
                {m}
              </option>
            ))}
          </select>
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400 text-[10px]">
            ▼
          </div>
        </div>

        {/* URL Input */}
        <div className="flex-1 relative">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="http://127.0.0.1:39888/api/health 或 https://api.example.com/v1/..."
            className="w-full h-10 px-3.5 rounded-xl border border-[#27272a] bg-[#141417] text-xs text-[#f4f4f5] font-mono placeholder:text-[#52525b] outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 transition-all"
          />
          {url && (
            <button
              onClick={() => setUrl('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* History Drawer Toggle */}
        <button
          onClick={() => setHistoryOpen(true)}
          className="h-10 px-3.5 rounded-xl border border-[#27272a] bg-[#141417] hover:bg-[#1f1f23] text-xs font-medium text-[#d4d4d8] flex items-center gap-2 transition-all shrink-0"
          title="查看请求历史"
        >
          <History className="w-4 h-4 text-blue-400" />
          <span>历史</span>
          {history.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-md bg-[#27272a] text-[10px] text-zinc-400 font-mono">
              {history.length}
            </span>
          )}
        </button>

        {/* Import Chrome Fetch */}
        <button
          onClick={() => setImportOpen(true)}
          className="h-10 px-3.5 rounded-xl border border-[#27272a] bg-[#141417] hover:bg-[#1f1f23] text-xs font-medium text-[#d4d4d8] flex items-center gap-2 transition-all shrink-0"
          title="导入浏览器 Copy as fetch"
        >
          <Upload className="w-4 h-4 text-emerald-400" />
          <span>导入 Fetch</span>
        </button>

        {/* Reset Button */}
        <button
          onClick={resetAll}
          className="h-10 w-10 rounded-xl border border-[#27272a] bg-[#141417] hover:bg-[#1f1f23] text-zinc-400 hover:text-white flex items-center justify-center transition-all shrink-0"
          title="重置全部"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* Send Action Button */}
        <button
          onClick={handleSend}
          disabled={sending}
          className="h-10 px-6 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20 disabled:opacity-50 transition-all shrink-0"
        >
          {sending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          <span>{sending ? '发送中...' : '发送请求'}</span>
        </button>
      </div>

      {/* Main Workspace Split View */}
      <div className="flex-1 flex overflow-hidden w-full">
        {/* Left Column: Request Headers & Body Editors */}
        <div className="w-1/2 flex flex-col border-r border-[#27272a] bg-[#09090b] min-w-[360px]">
          {/* Header Editor Section */}
          <div className="flex-1 flex flex-col border-b border-[#27272a] min-h-0">
            <div className="px-5 py-2.5 bg-[#0d0d10] border-b border-[#27272a] flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#d4d4d8]">
                <Code2 className="w-3.5 h-3.5 text-blue-400" />
                <span>Request Headers (JSON)</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleFormatJson(headersJson, setHeadersJson, 'Headers')}
                  className="px-2.5 py-1 rounded-lg bg-[#18181b] hover:bg-[#27272a] text-[11px] text-[#a1a1aa] hover:text-white border border-[#27272a] transition-all"
                >
                  格式化
                </button>
                <button
                  onClick={() => setHeadersJson('{}')}
                  className="px-2.5 py-1 rounded-lg bg-[#18181b] hover:bg-[#27272a] text-[11px] text-zinc-500 hover:text-zinc-300 border border-[#27272a] transition-all"
                >
                  清空
                </button>
              </div>
            </div>
            <textarea
              value={headersJson}
              onChange={(e) => setHeadersJson(e.target.value)}
              spellCheck={false}
              className="flex-1 w-full p-4 bg-[#09090b] font-mono text-xs text-[#e4e4e7] leading-relaxed outline-none resize-none selection:bg-blue-500/30"
              placeholder='{\n  "Authorization": "Bearer ..."\n}'
            />
          </div>

          {/* Body Editor Section */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="px-5 py-2.5 bg-[#0d0d10] border-b border-[#27272a] flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#d4d4d8]">
                <FileJson className="w-3.5 h-3.5 text-emerald-400" />
                <span>Request Body (JSON / Raw)</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleFormatJson(body, setBody, 'Body')}
                  className="px-2.5 py-1 rounded-lg bg-[#18181b] hover:bg-[#27272a] text-[11px] text-[#a1a1aa] hover:text-white border border-[#27272a] transition-all"
                >
                  格式化
                </button>
                <button
                  onClick={() => setBody('')}
                  className="px-2.5 py-1 rounded-lg bg-[#18181b] hover:bg-[#27272a] text-[11px] text-zinc-500 hover:text-zinc-300 border border-[#27272a] transition-all"
                >
                  清空
                </button>
              </div>
            </div>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              spellCheck={false}
              className="flex-1 w-full p-4 bg-[#09090b] font-mono text-xs text-[#e4e4e7] leading-relaxed outline-none resize-none selection:bg-blue-500/30"
              placeholder='{\n  "key": "value"\n}'
            />
          </div>
        </div>

        {/* Right Column: Response Details Panel */}
        <div className="w-1/2 flex flex-col bg-[#050507] min-w-[360px]">
          {/* Response Status & Metrics Header */}
          <div className="px-6 py-3 border-b border-[#27272a] bg-[#0c0c0f] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Response</span>

              {response ? (
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold font-mono border ${
                      response.response_status >= 200 && response.response_status < 300
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                    }`}
                  >
                    {response.response_status || 'ERROR'}
                  </span>
                  <span className="flex items-center gap-1 text-[11px] text-zinc-400 font-mono bg-[#18181b] px-2 py-0.5 rounded-md border border-[#27272a]">
                    <Clock className="w-3 h-3 text-blue-400" />
                    {response.duration_ms} ms
                  </span>
                  <span className="text-[11px] text-zinc-400 font-mono bg-[#18181b] px-2 py-0.5 rounded-md border border-[#27272a]">
                    {formatSize(response.response_body)}
                  </span>
                </div>
              ) : (
                <span className="text-xs text-zinc-500">等待发送...</span>
              )}
            </div>

            {/* Copy Response Button */}
            {response && (
              <button
                onClick={handleCopyResponseBody}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#18181b] hover:bg-[#27272a] text-xs font-medium text-[#d4d4d8] border border-[#27272a] transition-all"
                title="复制响应内容"
              >
                {copiedBody ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-blue-400" />}
                <span>{copiedBody ? '已复制' : '复制响应'}</span>
              </button>
            )}
          </div>

          {/* Response Sub-Tabs */}
          <div className="px-6 py-2 border-b border-[#27272a] bg-[#09090b] flex items-center gap-2 shrink-0">
            {(['json', 'headers', 'raw'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveResponseTab(tab)}
                className={`px-3 py-1 rounded-lg text-xs font-medium capitalize transition-all ${
                  activeResponseTab === tab
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#18181b]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Response Content View */}
          <div className="flex-1 overflow-auto p-5 font-mono text-xs leading-relaxed selection:bg-blue-500/30">
            {!response ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-600">
                <Send className="w-10 h-10 mb-3 opacity-30 animate-pulse" />
                <p className="text-xs">点击上方「发送请求」查看返回结果</p>
              </div>
            ) : activeResponseTab === 'headers' ? (
              <pre className="text-amber-300/90 whitespace-pre-wrap break-all">
                {formattedResponseHeaders || '无响应头'}
              </pre>
            ) : (
              <pre className="text-emerald-400 whitespace-pre-wrap break-all">
                {response.response_body || (response.error_message ? `Error: ${response.error_message}` : '(空响应体)')}
              </pre>
            )}
          </div>
        </div>
      </div>

      {/* History Drawer Modal */}
      {historyOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
          <div className="w-full max-w-xl bg-[#0e0e11] border-l border-[#27272a] h-full flex flex-col shadow-2xl">
            {/* History Header */}
            <div className="px-6 py-4 border-b border-[#27272a] flex items-center justify-between bg-[#121215]">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-bold text-white">请求历史记录</h3>
                <span className="px-2 py-0.5 rounded-full bg-[#27272a] text-zinc-400 text-[10px] font-mono">
                  {history.length}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {history.length > 0 && (
                  <button
                    onClick={handleClearHistory}
                    className="px-2.5 py-1 rounded-lg text-xs text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 transition-all flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" /> 清空全部
                  </button>
                )}
                <button
                  onClick={() => setHistoryOpen(false)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-[#27272a] transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* History Search Bar */}
            <div className="p-4 border-b border-[#27272a] flex items-center gap-2 bg-[#0a0a0c]">
              <div className="flex-1 relative">
                <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={historyKeyword}
                  onChange={(e) => setHistoryKeyword(e.target.value)}
                  placeholder="搜索 URL / 请求体..."
                  className="w-full h-8 pl-8 pr-3 rounded-lg border border-[#27272a] bg-[#141417] text-xs text-white placeholder:text-zinc-600 outline-none focus:border-blue-500"
                />
              </div>
              <select
                value={historyMethod}
                onChange={(e) => setHistoryMethod(e.target.value)}
                className="h-8 px-2 rounded-lg border border-[#27272a] bg-[#141417] text-xs text-zinc-300 outline-none"
              >
                <option value="">全部 Method</option>
                {methodList.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            {/* History Item List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {historyLoading ? (
                <div className="py-12 text-center text-xs text-zinc-500 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-400" /> 加载历史中...
                </div>
              ) : history.length === 0 ? (
                <div className="py-16 text-center text-xs text-zinc-500">暂无请求历史记录</div>
              ) : (
                history.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleLoadHistoryItem(item)}
                    className="p-3 rounded-xl border border-[#27272a]/70 hover:border-blue-500/40 bg-[#141417] hover:bg-[#1a1a1f] cursor-pointer transition-all group"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${getMethodColor(item.method)}`}>
                          {item.method}
                        </span>
                        <span
                          className={`text-[11px] font-mono font-bold ${
                            item.is_success === 1 ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {item.response_status || 'ERR'}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-mono">{item.duration_ms}ms</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-zinc-500">
                          {item.created_at ? item.created_at.slice(5, 16).replace('T', ' ') : ''}
                        </span>
                        <button
                          onClick={(e) => handleDeleteHistoryItem(item.id, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-rose-400 transition-all"
                          title="删除此条历史"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs font-mono text-zinc-300 truncate" title={item.url}>
                      {item.url}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Chrome "Copy as fetch" Import Modal */}
      {importOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-[#121215] rounded-2xl border border-[#27272a] shadow-2xl flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-[#27272a] flex items-center justify-between bg-[#15151a]">
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">导入 Chrome 浏览器 Copy as fetch</h3>
              </div>
              <button
                onClick={() => {
                  setImportOpen(false);
                  setImportError('');
                }}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-[#27272a]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-3">
              <p className="text-xs text-zinc-400 leading-relaxed">
                在 Chrome 浏览器 F12 开发者工具 Network 面板中，右键点击任意接口 ➔ <strong>Copy</strong> ➔{' '}
                <strong>Copy as fetch</strong>，并粘贴在下方：
              </p>
              <textarea
                value={importText}
                onChange={(e) => {
                  setImportText(e.target.value);
                  setImportError('');
                }}
                rows={9}
                spellCheck={false}
                placeholder='fetch("https://api.example.com/data", {\n  "headers": {\n    "accept": "*/*"\n  },\n  "body": "{\"page\":1}",\n  "method": "POST"\n});'
                className="w-full p-4 rounded-xl border border-[#27272a] bg-[#09090b] text-xs font-mono text-[#f4f4f5] outline-none focus:border-emerald-500/60 leading-relaxed"
              />
              {importError && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{importError}</span>
                </div>
              )}
            </div>

            <div className="px-6 py-3.5 border-t border-[#27272a] bg-[#15151a] flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setImportOpen(false);
                  setImportError('');
                }}
                className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-300 hover:bg-[#27272a] transition-all"
              >
                取消
              </button>
              <button
                onClick={handleImportFetchSubmit}
                disabled={!importText.trim()}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-40 transition-all shadow-md shadow-emerald-600/20"
              >
                确认导入
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
