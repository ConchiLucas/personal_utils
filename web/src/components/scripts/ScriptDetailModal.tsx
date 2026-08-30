import React, { useState } from 'react';
import { 
  X, 
  Code2, 
  Settings2, 
  Terminal, 
  Copy, 
  Check, 
  Play, 
  CheckCircle2, 
  AlertCircle,
  Zap
} from 'lucide-react';
import { ScriptItem, ScriptParamDef } from '../../types';

interface ScriptDetailModalProps {
  script: ScriptItem | null;
  open: boolean;
  onClose: () => void;
  onRun: (script: ScriptItem) => void;
}

export const ScriptDetailModal: React.FC<ScriptDetailModalProps> = ({
  script,
  open,
  onClose,
  onRun,
}) => {
  const [copiedCode, setCopiedCode] = useState(false);

  if (!open || !script) return null;

  const isDynamic = script.exec_mode === 'dynamic';

  let paramDefs: ScriptParamDef[] = [];
  if (script.params_schema) {
    try {
      paramDefs = JSON.parse(script.params_schema);
    } catch {}
  }

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(script.content);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-4xl max-h-[88vh] bg-[#121215] border border-[#27272a] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#27272a] bg-[#16161b] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-white tracking-tight">
                  {script.name}
                </h3>
                <span className="px-2 py-0.5 rounded-md bg-[#27272a] text-zinc-300 text-[10px] font-mono font-bold uppercase">
                  {script.script_type}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-medium border flex items-center gap-1 ${
                    isDynamic
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                  }`}
                >
                  {isDynamic ? <Settings2 className="w-2.5 h-2.5" /> : <Zap className="w-2.5 h-2.5" />}
                  <span>{isDynamic ? '动态传参' : '直接执行'}</span>
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-1">{script.description || '暂无描述说明'}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-[#27272a] transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#16161b] p-3.5 rounded-xl border border-[#27272a]">
            <div>
              <span className="text-[10px] text-zinc-500 block uppercase font-mono">归属分类</span>
              <span className="text-xs font-semibold text-zinc-200 mt-0.5 block">{script.category_slug}</span>
            </div>
            <div>
              <span className="text-[10px] text-zinc-500 block uppercase font-mono">超时限制</span>
              <span className="text-xs font-semibold text-zinc-200 mt-0.5 block">{script.timeout_sec} 秒</span>
            </div>
            <div>
              <span className="text-[10px] text-zinc-500 block uppercase font-mono">累计执行</span>
              <span className="text-xs font-semibold text-zinc-200 mt-0.5 block font-mono">{script.run_count} 次</span>
            </div>
            <div>
              <span className="text-[10px] text-zinc-500 block uppercase font-mono">最近状态</span>
              <div className="mt-0.5">
                {script.last_status === 'success' ? (
                  <span className="text-emerald-400 text-xs font-mono font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>成功 ({script.last_duration_ms}ms)</span>
                  </span>
                ) : script.last_status === 'failed' ? (
                  <span className="text-rose-400 text-xs font-mono font-medium flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    <span>失败</span>
                  </span>
                ) : (
                  <span className="text-zinc-500 text-xs font-mono">未执行</span>
                )}
              </div>
            </div>
          </div>

          {/* Dynamic Parameters Schema Breakdown (if dynamic) */}
          {isDynamic && paramDefs.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs font-bold text-amber-300">动态入参配置定义 ({paramDefs.length} 个变量)</h4>
              </div>

              <div className="border border-[#27272a] rounded-xl overflow-hidden bg-[#141417]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#1c1c22] text-zinc-400 text-[11px] font-mono border-b border-[#27272a]">
                    <tr>
                      <th className="px-3.5 py-2">参数变量 (KEY)</th>
                      <th className="px-3.5 py-2">参数标签</th>
                      <th className="px-3.5 py-2">类型</th>
                      <th className="px-3.5 py-2">默认值</th>
                      <th className="px-3.5 py-2 text-right">必填</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#27272a]/60">
                    {paramDefs.map((p) => (
                      <tr key={p.key} className="hover:bg-[#18181b] transition-colors font-mono text-[11px]">
                        <td className="px-3.5 py-2 font-bold text-amber-300">${'{' + p.key + '}'}</td>
                        <td className="px-3.5 py-2 text-zinc-200 font-sans">{p.label || p.key}</td>
                        <td className="px-3.5 py-2 text-zinc-400">{p.type}</td>
                        <td className="px-3.5 py-2 text-zinc-300 truncate max-w-[200px]">{String(p.default ?? '-')}</td>
                        <td className="px-3.5 py-2 text-right">
                          {p.required ? (
                            <span className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px]">
                              必填
                            </span>
                          ) : (
                            <span className="text-zinc-500 text-[10px]">可选</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Script Content Code Block */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-emerald-400" />
                <h4 className="text-xs font-bold text-zinc-200">脚本正文代码 (Script Content)</h4>
              </div>
              <button
                onClick={handleCopyCode}
                className="px-2.5 py-1 rounded-lg bg-[#18181b] hover:bg-[#27272a] text-zinc-300 hover:text-white border border-[#27272a] text-xs font-medium transition-all flex items-center gap-1.5"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-blue-400" />}
                <span>{copiedCode ? '代码已复制' : '复制代码'}</span>
              </button>
            </div>

            <div className="rounded-xl bg-[#09090b] border border-[#27272a] p-4 overflow-x-auto font-mono text-xs text-emerald-400/90 leading-relaxed max-h-96">
              <pre className="whitespace-pre">{script.content}</pre>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-[#27272a] bg-[#16161b] flex items-center justify-between shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-[#27272a] transition-all"
          >
            关闭详情
          </button>

          <button
            onClick={() => {
              onClose();
              onRun(script);
            }}
            className={`px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg transition-all ${
              isDynamic
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white shadow-amber-500/20'
                : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-500/20'
            }`}
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{isDynamic ? '配置参数并执行' : '立即执行脚本'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
