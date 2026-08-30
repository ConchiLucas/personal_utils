import React, { useState, useEffect } from 'react';
import { 
  Play, 
  X, 
  Settings2, 
  Loader2, 
  HelpCircle, 
  History, 
  CheckCircle2, 
  AlertCircle, 
  RotateCcw,
  Check
} from 'lucide-react';
import { ScriptItem, ScriptParamDef, ScriptExecutionLog } from '../../types';
import { api } from '../../api/client';

interface DynamicParamModalProps {
  script: ScriptItem | null;
  open: boolean;
  onClose: () => void;
  onExecute: (params: Record<string, any>) => Promise<void>;
}

export const DynamicParamModal: React.FC<DynamicParamModalProps> = ({
  script,
  open,
  onClose,
  onExecute,
}) => {
  const [params, setParams] = useState<Record<string, any>>({});
  const [paramDefs, setParamDefs] = useState<ScriptParamDef[]>([]);
  const [logs, setLogs] = useState<ScriptExecutionLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [appliedLogId, setAppliedLogId] = useState<number | null>(null);

  // Initialize parameters and fetch logs
  useEffect(() => {
    if (!script || !open) return;

    // 1. Parse Param Definitions
    let defs: ScriptParamDef[] = [];
    if (script.params_schema) {
      try {
        defs = JSON.parse(script.params_schema);
      } catch (err) {
        console.error('Failed to parse params_schema:', err);
      }
    }

    if (defs.length === 0) {
      const matched = Array.from(script.content.matchAll(/\$\{?([A-Z0-9_]+)\}?/g)).map((m) => m[1]);
      const uniqueKeys = Array.from(new Set(matched));
      defs = uniqueKeys.map((k) => ({
        key: k,
        label: k,
        type: 'string',
        default: '',
        required: true,
      }));
    }

    setParamDefs(defs);

    // 2. Initialize values: Prefer script.default_params (which stores the latest executed parameters)
    let initialValues: Record<string, any> = {};
    if (script.default_params) {
      try {
        initialValues = JSON.parse(script.default_params);
      } catch {}
    }

    defs.forEach((d) => {
      if (initialValues[d.key] === undefined) {
        initialValues[d.key] = d.default !== undefined ? d.default : '';
      }
    });

    setParams(initialValues);

    // 3. Fetch Execution History Logs for this script
    loadHistory(script.id);
  }, [script, open]);

  const loadHistory = async (scriptId: number) => {
    setLoadingLogs(true);
    try {
      const historyLogs = await api.getScriptLogs(scriptId);
      setLogs(historyLogs);
    } catch (err) {
      console.error('Failed to load script logs:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  if (!open || !script) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setExecuting(true);
    try {
      await onExecute(params);
      onClose();
    } finally {
      setExecuting(false);
    }
  };

  const handleFieldChange = (key: string, value: any) => {
    setParams((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // Apply historical parameters
  const handleApplyHistory = (log: ScriptExecutionLog) => {
    try {
      const parsed = JSON.parse(log.params);
      setParams((prev) => ({
        ...prev,
        ...parsed,
      }));
      setAppliedLogId(log.id);
      setTimeout(() => setAppliedLogId(null), 1500);
    } catch (err) {
      console.error('Failed to parse history params:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-4xl max-h-[85vh] bg-[#121215] border border-[#27272a] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#27272a] bg-[#16161b] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Settings2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>{script.name}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                  动态传参执行
                </span>
              </h3>
              <p className="text-[11px] text-zinc-400 mt-0.5 truncate max-w-md">
                {script.description || '执行后系统将自动保存当前参数，下一次打开将默认带入'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-[#27272a] transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content - Two Column Layout (Left: Form, Right: History) */}
        <div className="flex-1 flex overflow-hidden min-h-[380px]">
          {/* Left Column: Parameter Form */}
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col border-r border-[#27272a] p-6 justify-between overflow-y-auto">
            <div className="space-y-4">
              <div className="space-y-3.5 pr-1">
                {paramDefs.map((def) => {
                  const val = params[def.key] ?? '';

                  return (
                    <div key={def.key} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-[#f4f4f5] flex items-center gap-1.5">
                          <span>{def.label || def.key}</span>
                          <span className="text-[10px] font-mono text-zinc-500 font-normal">(${def.key})</span>
                          {def.required && <span className="text-rose-400 text-[10px]">*</span>}
                        </label>
                        {def.description && (
                          <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                            <HelpCircle className="w-2.5 h-2.5" />
                            {def.description}
                          </span>
                        )}
                      </div>

                      {def.type === 'select' && def.options ? (
                        <select
                          value={val}
                          onChange={(e) => handleFieldChange(def.key, e.target.value)}
                          className="w-full h-9 px-3 rounded-xl bg-[#18181b] border border-[#27272a] text-xs text-white outline-none focus:border-amber-500/60 font-mono"
                        >
                          {def.options.map((opt) => (
                            <option key={opt} value={opt} className="bg-[#18181b]">
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : def.type === 'number' ? (
                        <input
                          type="number"
                          value={val}
                          required={def.required}
                          onChange={(e) => handleFieldChange(def.key, Number(e.target.value))}
                          className="w-full h-9 px-3.5 rounded-xl bg-[#18181b] border border-[#27272a] text-xs text-white outline-none focus:border-amber-500/60 font-mono"
                        />
                      ) : (
                        <input
                          type="text"
                          value={val}
                          required={def.required}
                          onChange={(e) => handleFieldChange(def.key, e.target.value)}
                          className="w-full h-9 px-3.5 rounded-xl bg-[#18181b] border border-[#27272a] text-xs text-white outline-none focus:border-amber-500/60 font-mono"
                          placeholder={`请输入 ${def.label || def.key}...`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Form Footer */}
            <div className="pt-4 mt-6 border-t border-[#27272a] flex items-center justify-between">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-[#18181b] transition-all"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={executing}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white flex items-center gap-2 shadow-lg shadow-amber-500/20 disabled:opacity-50 transition-all"
              >
                {executing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-current" />
                )}
                <span>{executing ? '执行中...' : '立即执行并保存参数'}</span>
              </button>
            </div>
          </form>

          {/* Right Column: Execution History List */}
          <div className="w-80 bg-[#0d0d10] flex flex-col overflow-hidden shrink-0">
            <div className="px-4 py-3 border-b border-[#27272a] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-3.5 h-3.5 text-zinc-400" />
                <span className="text-xs font-bold text-zinc-300">历史传参记录</span>
              </div>
              <span className="text-[10px] text-zinc-500 font-mono">
                {logs.length} 条记录
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {loadingLogs ? (
                <div className="py-12 text-center text-xs text-zinc-500">加载历史中...</div>
              ) : logs.length === 0 ? (
                <div className="py-16 text-center text-xs text-zinc-500">
                  <History className="w-6 h-6 mx-auto mb-2 opacity-30" />
                  <p>暂无历史执行记录</p>
                  <p className="text-[10px] text-zinc-600 mt-1">执行后将记录每次传入的参数</p>
                </div>
              ) : (
                logs.map((log) => {
                  let parsedParams: Record<string, any> = {};
                  try {
                    parsedParams = JSON.parse(log.params || '{}');
                  } catch {}

                  const isApplied = appliedLogId === log.id;

                  return (
                    <div
                      key={log.id}
                      onClick={() => handleApplyHistory(log)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer group ${
                        isApplied
                          ? 'bg-amber-500/10 border-amber-500/50 shadow-md'
                          : 'bg-[#141417] border-[#27272a] hover:border-zinc-500/50 hover:bg-[#18181b]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          {log.status === 'success' ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <AlertCircle className="w-3 h-3 text-rose-400" />
                          )}
                          <span className="text-[10px] font-mono text-zinc-400">
                            {log.created_at ? log.created_at.replace('T', ' ').slice(5, 19) : ''}
                          </span>
                        </div>

                        <span className="text-[10px] font-mono text-zinc-500">
                          {log.duration_ms}ms
                        </span>
                      </div>

                      {/* Parameter Badges */}
                      <div className="space-y-1 my-1.5">
                        {Object.entries(parsedParams).map(([k, v]) => (
                          <div key={k} className="flex items-center justify-between text-[11px] font-mono">
                            <span className="text-zinc-500">{k}:</span>
                            <span className="text-amber-300 truncate max-w-[140px]">{String(v)}</span>
                          </div>
                        ))}
                      </div>

                      <div className="pt-1.5 border-t border-[#27272a]/60 flex items-center justify-between text-[10px]">
                        <span className="text-zinc-500 group-hover:text-amber-400 transition-colors flex items-center gap-1">
                          {isApplied ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-400">已回填参数</span>
                            </>
                          ) : (
                            <>
                              <RotateCcw className="w-2.5 h-2.5" />
                              <span>点击载入此参数</span>
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
