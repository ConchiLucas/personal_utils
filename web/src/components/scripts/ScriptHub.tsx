import React, { useState, useEffect, useMemo } from 'react';
import {
  Terminal,
  Play,
  Settings2,
  Search,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Zap,
  Eye,
  FileCode2
} from 'lucide-react';
import { ScriptCategory, ScriptItem, ScriptRunResponse } from '../../types';
import { api } from '../../api/client';
import { ScriptSidebar } from './ScriptSidebar';
import { DynamicParamModal } from './DynamicParamModal';
import { ScriptTerminalDrawer } from './ScriptTerminalDrawer';
import { ScriptDetailModal } from './ScriptDetailModal';

export const ScriptHub: React.FC = () => {
  const [categories, setCategories] = useState<ScriptCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [scripts, setScripts] = useState<ScriptItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Search & Filter
  const [keyword, setKeyword] = useState('');
  const [modeFilter, setModeFilter] = useState<'all' | 'direct' | 'dynamic'>('all');

  // Script Detail Modal State
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailScript, setDetailScript] = useState<ScriptItem | null>(null);

  // Dynamic Param Modal State
  const [paramModalOpen, setParamModalOpen] = useState(false);
  const [paramScript, setParamScript] = useState<ScriptItem | null>(null);

  // Terminal Drawer execution state
  const [activeScript, setActiveScript] = useState<ScriptItem | null>(null);
  const [execResult, setExecResult] = useState<ScriptRunResponse | null>(null);
  const [running, setRunning] = useState(false);
  const [lastParams, setLastParams] = useState<Record<string, any>>({});

  const [copiedScriptId, setCopiedScriptId] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (text: string) => {
    setToastMessage(text);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Load Categories
  const loadCategories = async () => {
    try {
      const data = await api.getScriptCategories();
      setCategories(data);
    } catch (err) {
      console.error('Failed to load script categories:', err);
    }
  };

  // Load Scripts
  const loadScripts = async () => {
    setLoading(true);
    try {
      const catObj = categories.find((c) => c.slug === selectedCategory);
      const data = await api.getScripts({
        category_slug: selectedCategory === 'all' ? undefined : selectedCategory,
        category_id: catObj?.id,
        keyword: keyword.trim() || undefined,
        exec_mode: modeFilter === 'all' ? undefined : modeFilter,
      });
      setScripts(data);
    } catch (err) {
      console.error('Failed to load scripts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadScripts();
  }, [selectedCategory, keyword, modeFilter, categories]);

  // Execute Script
  const executeScript = async (script: ScriptItem, params: Record<string, any> = {}) => {
    setActiveScript(script);
    setLastParams(params);
    setRunning(true);
    setExecResult(null);

    try {
      const res = await api.runScript(script.id, params);
      setExecResult(res);
      loadScripts();
      if (res.status === 'success') {
        showToast(`执行成功 · 耗时 ${res.duration_ms}ms`);
      } else {
        showToast(`执行失败 (退出码: ${res.exit_code})`);
      }
    } catch (err: any) {
      setExecResult({
        script_id: script.id,
        script_name: script.name,
        status: 'failed',
        exit_code: -1,
        output: `[Antigravity Error] ${err.message}`,
        duration_ms: 0,
        run_at: new Date().toISOString(),
      });
      showToast(`执行异常: ${err.message}`);
    } finally {
      setRunning(false);
    }
  };

  // Click on "Run"
  const handleRunClick = (script: ScriptItem) => {
    if (script.exec_mode === 'dynamic') {
      setParamScript(script);
      setParamModalOpen(true);
    } else {
      executeScript(script, {});
    }
  };

  // View Script Details
  const handleViewDetail = (script: ScriptItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDetailScript(script);
    setDetailModalOpen(true);
  };

  // Copy Script Code
  const handleCopyCode = async (script: ScriptItem, e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(script.content);
    setCopiedScriptId(script.id);
    setTimeout(() => setCopiedScriptId(null), 2000);
    showToast('脚本代码已复制');
  };

  const totalScriptCount = useMemo(() => {
    return categories.reduce((acc, c) => acc + (c.script_count ?? 0), 0);
  }, [categories]);

  const activeCategoryObj = categories.find((c) => c.slug === selectedCategory);

  return (
    <div className="flex-1 flex overflow-hidden bg-[#09090b] w-full text-[#f4f4f5] select-none">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute top-16 right-6 z-50 px-4 py-2 rounded-xl text-xs font-medium bg-zinc-900 border border-zinc-700 shadow-xl flex items-center gap-2 animate-in fade-in duration-150">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Left Category Sidebar */}
      <ScriptSidebar
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        totalScriptCount={totalScriptCount}
      />

      {/* Right Script List & Work Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#09090b]">
        {/* Top Header & Search Bar */}
        <div className="px-6 py-4 border-b border-[#27272a] bg-[#0d0d10] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>{activeCategoryObj?.name || '🌟 全部脚本 (All)'}</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#18181b] border border-[#27272a] text-zinc-400 font-mono">
                {scripts.length} 个脚本
              </span>
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              {activeCategoryObj?.description || '本地宿主机运维、数据库备份、网络诊断与自动化工具库'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="搜索脚本名称 / 代码..."
                className="w-60 h-9 pl-8 pr-3 rounded-xl border border-[#27272a] bg-[#141417] text-xs text-white placeholder:text-zinc-600 outline-none focus:border-emerald-500 transition-all font-mono"
              />
            </div>

            {/* Mode Filter Pills */}
            <div className="flex items-center bg-[#141417] p-1 rounded-xl border border-[#27272a] text-xs">
              {(['all', 'direct', 'dynamic'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setModeFilter(mode)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    modeFilter === mode
                      ? 'bg-[#27272a] text-white font-semibold'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {mode === 'all' ? '全部' : mode === 'direct' ? '⚡ 直接执行' : '⚙️ 动态传参'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Script Table / List View */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="py-20 text-center text-xs text-zinc-500">加载脚本列表中...</div>
          ) : scripts.length === 0 ? (
            <div className="py-24 text-center flex flex-col items-center justify-center text-zinc-500">
              <Terminal className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm font-medium text-zinc-400">当前分类暂无脚本</p>
            </div>
          ) : (
            <div className="border border-[#27272a] rounded-2xl overflow-hidden bg-[#121215] shadow-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#27272a] bg-[#16161b] text-zinc-400 text-[11px] font-mono uppercase tracking-wider">
                    <th className="py-3.5 px-5 font-semibold">脚本名称 & 描述</th>
                    <th className="py-3.5 px-4 font-semibold w-44">模式 & 类型</th>
                    <th className="py-3.5 px-4 font-semibold">动态参数概览</th>
                    <th className="py-3.5 px-4 font-semibold w-40">最近执行</th>
                    <th className="py-3.5 px-5 font-semibold text-right w-64">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#27272a]/60">
                  {scripts.map((script) => {
                    const isDynamic = script.exec_mode === 'dynamic';

                    // Parse param keys for list chips
                    let paramKeys: string[] = [];
                    if (script.params_schema) {
                      try {
                        const parsed = JSON.parse(script.params_schema);
                        paramKeys = parsed.map((p: any) => p.key);
                      } catch {}
                    }

                    return (
                      <tr
                        key={script.id}
                        onClick={() => handleViewDetail(script)}
                        className="hover:bg-[#18181b]/80 transition-colors cursor-pointer group"
                      >
                        {/* 1. Name & Description */}
                        <td className="py-4 px-5 align-middle">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-[#1c1c22] border border-[#27272a] flex items-center justify-center text-emerald-400 shrink-0 mt-0.5 group-hover:border-emerald-500/40 transition-colors">
                              <FileCode2 className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <h3 className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors truncate">
                                {script.name}
                              </h3>
                              <p className="text-[11px] text-zinc-400 truncate max-w-md mt-0.5">
                                {script.description || '暂无描述'}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* 2. Mode & Type */}
                        <td className="py-4 px-4 align-middle">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="px-2 py-0.5 rounded bg-[#1c1c22] text-zinc-300 border border-[#27272a] text-[10px] font-mono font-bold uppercase">
                              {script.script_type}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-medium border flex items-center gap-1 ${
                                isDynamic
                                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                  : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                              }`}
                            >
                              {isDynamic ? <Settings2 className="w-2.5 h-2.5" /> : <Zap className="w-2.5 h-2.5" />}
                              <span>{isDynamic ? '动态传参' : '直接执行'}</span>
                            </span>
                          </div>
                        </td>

                        {/* 3. Parameter Chips */}
                        <td className="py-4 px-4 align-middle">
                          {isDynamic && paramKeys.length > 0 ? (
                            <div className="flex items-center gap-1 flex-wrap max-w-xs">
                              {paramKeys.slice(0, 3).map((k) => (
                                <span
                                  key={k}
                                  className="px-1.5 py-0.5 rounded bg-[#18181b] border border-[#27272a] text-[10px] font-mono text-zinc-400"
                                >
                                  ${'{' + k + '}'}
                                </span>
                              ))}
                              {paramKeys.length > 3 && (
                                <span className="text-[10px] text-zinc-500 font-mono">
                                  +{paramKeys.length - 3}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[11px] text-zinc-500 font-mono">-</span>
                          )}
                        </td>

                        {/* 4. Last Run Status */}
                        <td className="py-4 px-4 align-middle">
                          {script.last_status ? (
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5">
                                {script.last_status === 'success' ? (
                                  <span className="text-emerald-400 text-xs font-mono font-semibold flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span>{script.last_duration_ms}ms</span>
                                  </span>
                                ) : (
                                  <span className="text-rose-400 text-xs font-mono font-semibold flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" />
                                    <span>失败</span>
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-zinc-500 font-mono block">
                                {script.last_run_at ? script.last_run_at.slice(5, 16).replace('T', ' ') : ''}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[11px] text-zinc-600 font-mono">未执行</span>
                          )}
                        </td>

                        {/* 5. Row Actions */}
                        <td className="py-4 px-5 align-middle text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            {/* View Detail Button */}
                            <button
                              onClick={(e) => handleViewDetail(script, e)}
                              className="px-2.5 py-1.5 rounded-lg bg-[#18181b] hover:bg-[#27272a] text-zinc-300 hover:text-white border border-[#27272a] text-xs font-medium transition-all flex items-center gap-1.5"
                              title="查看脚本详情与代码"
                            >
                              <Eye className="w-3.5 h-3.5 text-blue-400" />
                              <span>详情</span>
                            </button>

                            {/* Copy Code */}
                            <button
                              onClick={(e) => handleCopyCode(script, e)}
                              className="p-1.5 rounded-lg bg-[#18181b] hover:bg-[#27272a] text-zinc-400 hover:text-white border border-[#27272a] text-xs font-medium transition-all"
                              title="复制代码"
                            >
                              {copiedScriptId === script.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>

                            {/* Main Run Button */}
                            <button
                              onClick={() => handleRunClick(script)}
                              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-md ${
                                isDynamic
                                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white shadow-amber-500/10'
                                  : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-500/10'
                              }`}
                            >
                              <Play className="w-3 h-3 fill-current" />
                              <span>{isDynamic ? '配置并执行' : '立即执行'}</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Script Detail Modal */}
      <ScriptDetailModal
        script={detailScript}
        open={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setDetailScript(null);
        }}
        onRun={(s) => handleRunClick(s)}
      />

      {/* Dynamic Parameter Execution Modal with History */}
      <DynamicParamModal
        script={paramScript}
        open={paramModalOpen}
        onClose={() => {
          setParamModalOpen(false);
          setParamScript(null);
        }}
        onExecute={async (params) => {
          if (paramScript) {
            await executeScript(paramScript, params);
          }
        }}
      />

      {/* Execution Terminal Output Drawer */}
      <ScriptTerminalDrawer
        script={activeScript}
        result={execResult}
        running={running}
        onClose={() => {
          setActiveScript(null);
          setExecResult(null);
        }}
        onReRun={() => {
          if (activeScript) {
            executeScript(activeScript, lastParams);
          }
        }}
      />
    </div>
  );
};
