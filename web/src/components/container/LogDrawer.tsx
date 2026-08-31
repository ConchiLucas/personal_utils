import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  RefreshCw, 
  Copy, 
  Check, 
  Search, 
  Terminal, 
  SlidersHorizontal
} from 'lucide-react';
import { ContainerInfo } from '../../types';
import { api } from '../../api/client';

interface LogDrawerProps {
  container: ContainerInfo | null;
  onClose: () => void;
}

export const LogDrawer: React.FC<LogDrawerProps> = ({ container, onClose }) => {
  const [logs, setLogs] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [tail, setTail] = useState(200);
  const [search, setSearch] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [copied, setCopied] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  const fetchLogs = async () => {
    if (!container) return;
    setIsLoading(true);
    try {
      const res = await api.getContainerLogs(container.id, tail);
      setLogs(res.logs || '暂无日志输出');
    } catch (err: any) {
      setLogs(`[Error] 获取日志失败: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (container) {
      fetchLogs();
    }
  }, [container, tail]);

  // Auto refresh interval
  useEffect(() => {
    if (!autoRefresh || !container) return;
    const timer = setInterval(() => {
      fetchLogs();
    }, 3000);
    return () => clearInterval(timer);
  }, [autoRefresh, container, tail]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleCopy = () => {
    navigator.clipboard.writeText(logs);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!container) return null;

  // Filter logs by search query
  const filteredLines = logs.split('\n').filter((line) => {
    if (!search) return true;
    return line.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div 
      className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm transition-opacity cursor-pointer"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-3xl bg-[#09090b] border-l border-[#27272a] h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200 cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="p-4 border-b border-[#27272a] flex items-center justify-between bg-[#18181b]/80">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-white font-mono">
                  {container.name}
                </h3>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#27272a] text-[#a1a1aa] font-mono">
                  {container.short_id}
                </span>
              </div>
              <p className="text-[11px] text-[#71717a] truncate max-w-sm mt-0.5">
                Image: {container.image}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-2.5 py-1 rounded bg-[#27272a] hover:bg-[#3f3f46] text-[#a1a1aa] hover:text-white text-xs flex items-center gap-1.5 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? '已复制' : '复制日志'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded hover:bg-[#27272a] text-[#71717a] hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="px-4 py-2.5 bg-[#121215] border-b border-[#27272a] flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Search inside logs */}
          <div className="relative flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#71717a]" />
            <input
              type="text"
              placeholder="过滤日志关键字..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#18181b] border border-[#27272a] rounded pl-8 pr-2.5 py-1 text-xs text-white placeholder:text-[#71717a] focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Controls: Tail lines & Auto Refresh */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-[#a1a1aa]">
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#71717a]" />
              <span>行数:</span>
              <select
                value={tail}
                onChange={(e) => setTail(Number(e.target.value))}
                className="bg-[#18181b] border border-[#27272a] rounded px-2 py-0.5 text-white focus:outline-none"
              >
                <option value={100}>100 行</option>
                <option value={200}>200 行</option>
                <option value={500}>500 行</option>
                <option value={1000}>1000 行</option>
              </select>
            </div>

            <label className="flex items-center gap-1.5 cursor-pointer text-[#a1a1aa] select-none">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded border-[#27272a] bg-[#18181b] text-blue-500 focus:ring-0"
              />
              <span>实时自动刷新</span>
            </label>

            <button
              onClick={fetchLogs}
              disabled={isLoading}
              className="p-1 rounded hover:bg-[#27272a] text-[#a1a1aa] hover:text-white transition-colors"
              title="手动刷新日志"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Log Viewer Terminal Screen */}
        <div className="flex-1 bg-[#050507] p-4 font-mono text-xs overflow-y-auto text-[#d4d4d8] selection:bg-blue-600/40">
          {filteredLines.length === 0 ? (
            <div className="text-[#52525b] py-8 text-center">无匹配的日志记录</div>
          ) : (
            filteredLines.map((line, idx) => (
              <div key={idx} className="leading-relaxed hover:bg-[#18181b]/50 px-1 rounded whitespace-pre-wrap break-all">
                <span className="text-[#52525b] select-none mr-2">{idx + 1}</span>
                {line}
              </div>
            ))
          )}
          <div ref={logEndRef} />
        </div>
      </div>
    </div>
  );
};
