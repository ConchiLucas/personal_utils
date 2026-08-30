import React, { useState } from 'react';
import { 
  Terminal, 
  Copy, 
  Check, 
  RotateCcw, 
  X, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Loader2 
} from 'lucide-react';
import { ScriptItem, ScriptRunResponse } from '../../types';

interface ScriptTerminalDrawerProps {
  script: ScriptItem | null;
  result: ScriptRunResponse | null;
  running: boolean;
  onClose: () => void;
  onReRun: () => void;
}

export const ScriptTerminalDrawer: React.FC<ScriptTerminalDrawerProps> = ({
  script,
  result,
  running,
  onClose,
  onReRun,
}) => {
  const [copied, setCopied] = useState(false);

  if (!script && !result && !running) return null;

  const handleCopy = async () => {
    if (!result?.output) return;
    await navigator.clipboard.writeText(result.output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 bg-[#0e0e11] border-t border-[#27272a] shadow-2xl transition-all animate-in slide-in-from-bottom-6 duration-200 flex flex-col h-80 max-h-[50vh]">
      {/* Header */}
      <div className="px-6 py-2.5 bg-[#121215] border-b border-[#27272a] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-white font-mono">
              {script?.name || '脚本执行控制台'}
            </span>
          </div>

          {running ? (
            <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] flex items-center gap-1 font-mono">
              <Loader2 className="w-3 h-3 animate-spin" /> 执行中...
            </span>
          ) : result ? (
            <div className="flex items-center gap-2">
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono border flex items-center gap-1 ${
                  result.status === 'success'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                }`}
              >
                {result.status === 'success' ? (
                  <CheckCircle2 className="w-2.5 h-2.5" />
                ) : (
                  <AlertCircle className="w-2.5 h-2.5" />
                )}
                <span>{result.status === 'success' ? 'SUCCESS (0)' : `FAILED (${result.exit_code})`}</span>
              </span>

              <span className="text-[11px] text-zinc-400 font-mono flex items-center gap-1 bg-[#18181b] px-2 py-0.5 rounded border border-[#27272a]">
                <Clock className="w-2.5 h-2.5 text-blue-400" />
                {result.duration_ms} ms
              </span>
            </div>
          ) : null}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {result && (
            <button
              onClick={handleCopy}
              className="px-2.5 py-1 rounded-lg bg-[#18181b] hover:bg-[#27272a] text-[11px] text-zinc-300 hover:text-white border border-[#27272a] transition-all flex items-center gap-1.5"
              title="复制控制台输出"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-blue-400" />}
              <span>{copied ? '已复制' : '复制输出'}</span>
            </button>
          )}

          <button
            onClick={onReRun}
            disabled={running}
            className="px-2.5 py-1 rounded-lg bg-[#18181b] hover:bg-[#27272a] text-[11px] text-zinc-300 hover:text-white border border-[#27272a] transition-all flex items-center gap-1.5 disabled:opacity-50"
            title="重新执行"
          >
            <RotateCcw className={`w-3 h-3 ${running ? 'animate-spin' : ''}`} />
            <span>重新执行</span>
          </button>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-[#27272a] transition-all"
            title="关闭控制台"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Terminal Output Body */}
      <div className="flex-1 overflow-auto p-4 bg-[#050507] font-mono text-xs leading-relaxed selection:bg-emerald-500/30">
        {running ? (
          <div className="flex items-center gap-2 text-zinc-400 animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
            <span>进程正在执行中，请稍候...</span>
          </div>
        ) : result ? (
          <pre className="whitespace-pre-wrap break-all text-zinc-200">
            {result.output || '(脚本执行完毕，无标准输出)'}
          </pre>
        ) : (
          <span className="text-zinc-600">等待执行结果...</span>
        )}
      </div>
    </div>
  );
};
