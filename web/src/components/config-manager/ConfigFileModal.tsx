import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Save,
  Eye,
  Edit3,
  RefreshCw,
  Sparkles,
  FileCode,
  FolderOpen,
  Copy,
  Check,
  RotateCw
} from 'lucide-react';
import Prism from 'prismjs';
import 'prismjs/components/prism-toml';
import 'prismjs/components/prism-ini';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-markup';

import { api } from '../../api/client';
import { ServiceConfig } from '../../types';

interface ConfigFileModalProps {
  service: ServiceConfig | null;
  onClose: () => void;
  onRefreshNeeded?: () => void;
}

const detectLangFromPath = (path: string): string => {
  const p = path.toLowerCase();
  if (p.endsWith('.toml')) return 'toml';
  if (p.endsWith('.conf') || p.includes('nginx')) return 'ini';
  if (p.endsWith('.yml') || p.endsWith('.yaml')) return 'yaml';
  if (p.endsWith('.json')) return 'json';
  if (p.endsWith('.env') || p.endsWith('.ini')) return 'ini';
  if (p.endsWith('.sh')) return 'bash';
  return 'ini';
};

export const ConfigFileModal: React.FC<ConfigFileModalProps> = ({
  service,
  onClose,
  onRefreshNeeded,
}) => {
  const [content, setContent] = useState<string>('');
  const [originalContent, setOriginalContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [acting, setActing] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (text: string) => {
    setToastMessage(text);
    setTimeout(() => setToastMessage(null), 2500);
  };

  useEffect(() => {
    if (!service) return;

    setLoading(true);
    api
      .getServiceConfigFile(service.id)
      .then((res) => {
        setContent(res.content);
        setOriginalContent(res.content);
        setIsEditMode(false);
      })
      .catch((err) => {
        showToast(`读取配置文件失败: ${err.message}`);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [service]);

  if (!service) return null;

  const lang = detectLangFromPath(service.config_path);

  const highlightedHtml = useMemo(() => {
    const grammar = Prism.languages[lang] || Prism.languages.ini || Prism.languages.markup;
    try {
      return Prism.highlight(content, grammar, lang);
    } catch {
      return content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
  }, [content, lang]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateServiceConfigFile(service.id, content);
      setOriginalContent(content);
      showToast('🎉 配置文件已成功保存至宿主机磁盘！');
    } catch (err: any) {
      showToast(`保存失败: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleAction = async (action: 'start' | 'stop' | 'restart') => {
    setActing(action);
    try {
      const res = await api.executeServiceAction(service.id, action);
      showToast(`✅ ${res.message}`);
      if (onRefreshNeeded) onRefreshNeeded();
    } catch (err: any) {
      showToast(`执行失败: ${err.message}`);
    } finally {
      setActing(null);
    }
  };

  const handleOpenLocal = async () => {
    try {
      await api.openSystemPath(service.config_path);
      showToast('已调用 macOS 本地编辑器打开该配置文件');
    } catch (err: any) {
      showToast(`打开失败: ${err.message}`);
    }
  };

  const handleCopyPath = async () => {
    await navigator.clipboard.writeText(service.config_path);
    setCopied(true);
    showToast('配置路径已复制');
    setTimeout(() => setCopied(false), 1800);
  };

  const hasUnsavedChanges = content !== originalContent;
  const lines = content.split('\n');

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none animate-in fade-in duration-150">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-6 right-8 z-50 px-4 py-2 rounded-xl text-xs font-medium bg-[#1c1c22] text-white border border-emerald-500/40 shadow-2xl flex items-center gap-2 animate-in fade-in duration-150">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="w-full max-w-5xl h-[88vh] bg-[#121215] border border-[#27272a] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-3.5 border-b border-[#27272a] bg-[#16161b] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-lg bg-[#18181b] border border-[#27272a] text-blue-400 shrink-0">
              <FileCode className="w-4 h-4 text-sky-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white truncate max-w-md">{service.name}</h3>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono uppercase">
                  {lang}
                </span>
                {hasUnsavedChanges && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 font-mono">
                    未保存修改
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500 mt-0.5">
                <span className="text-zinc-400 truncate max-w-xl" title={service.config_path}>
                  {service.config_path}
                </span>
              </div>
            </div>
          </div>

          {/* Actions on Header */}
          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center p-0.5 rounded-lg bg-[#18181b] border border-[#27272a] text-xs">
              <button
                onClick={() => setIsEditMode(false)}
                className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ${
                  !isEditMode ? 'bg-[#27272a] text-white font-medium shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Eye className="w-3 h-3 text-purple-400" />
                <span>高亮预览</span>
              </button>
              <button
                onClick={() => setIsEditMode(true)}
                className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ${
                  isEditMode ? 'bg-[#27272a] text-white font-medium shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Edit3 className="w-3 h-3 text-blue-400" />
                <span>在线编辑</span>
              </button>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={saving || !hasUnsavedChanges}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all ${
                hasUnsavedChanges
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                  : 'bg-[#18181b] text-zinc-500 border border-[#27272a] cursor-not-allowed'
              }`}
            >
              {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>{saving ? '保存中...' : '保存至宿主机'}</span>
            </button>

            {/* Restart Service Button */}
            {service.restart_cmd && (
              <button
                onClick={() => handleAction('restart')}
                disabled={acting !== null}
                className="px-2.5 py-1.5 rounded-xl bg-purple-600/10 hover:bg-purple-600/20 text-purple-400 border border-purple-500/30 text-xs font-medium transition-all flex items-center gap-1"
                title="保存后一键重启该服务使配置生效"
              >
                {acting === 'restart' ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RotateCw className="w-3.5 h-3.5" />
                )}
                <span>重启服务</span>
              </button>
            )}

            {/* Open in macOS Native App */}
            <button
              onClick={handleOpenLocal}
              className="p-1.5 rounded-xl bg-[#18181b] hover:bg-[#27272a] text-zinc-400 hover:text-white border border-[#27272a] transition-all"
              title="在 macOS 默认编辑器中打开"
            >
              <FolderOpen className="w-4 h-4" />
            </button>

            {/* Copy Path */}
            <button
              onClick={handleCopyPath}
              className="p-1.5 rounded-xl bg-[#18181b] hover:bg-[#27272a] text-zinc-400 hover:text-white border border-[#27272a] transition-all"
              title="复制完整路径"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-[#18181b] hover:bg-[#27272a] text-zinc-400 hover:text-white border border-[#27272a] transition-all ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-hidden bg-[#09090b] relative flex flex-col">
          {loading ? (
            <div className="flex-1 flex items-center justify-center text-xs text-zinc-500 gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-blue-400" />
              <span>正在从宿主机读取配置文件...</span>
            </div>
          ) : !isEditMode ? (
            /* Syntax Highlighted View */
            <div className="flex-1 overflow-auto bg-[#09090b] flex font-mono text-xs select-text">
              {/* Line Numbers */}
              <div className="w-12 bg-[#0d0d10] border-r border-[#27272a] py-6 text-right pr-3 select-none text-zinc-600 space-y-0 shrink-0">
                {lines.map((_, idx) => (
                  <div key={idx} className="h-5 flex items-center justify-end text-[11px]">
                    {idx + 1}
                  </div>
                ))}
              </div>
              {/* Code Lines */}
              <div className="flex-1 p-6 overflow-x-auto text-zinc-200">
                {highlightedHtml.split('\n').map((lineHtml, idx) => (
                  <div
                    key={idx}
                    className="h-5 flex items-center whitespace-pre hover:bg-[#18181b]/50 transition-colors"
                    dangerouslySetInnerHTML={{ __html: lineHtml || '&nbsp;' }}
                  />
                ))}
              </div>
            </div>
          ) : (
            /* Editable Code Area */
            <div className="flex-1 flex overflow-hidden">
              <div className="w-12 bg-[#0d0d10] border-r border-[#27272a] py-6 text-right pr-3 select-none font-mono text-xs text-zinc-600 space-y-0 shrink-0">
                {lines.map((_, idx) => (
                  <div key={idx} className="h-5 flex items-center justify-end text-[11px]">
                    {idx + 1}
                  </div>
                ))}
              </div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="请输入配置文件内容..."
                className="flex-1 bg-[#09090b] text-[#f4f4f5] font-mono text-xs p-6 outline-none resize-none leading-relaxed selection:bg-blue-500/30 selection:text-white"
                spellCheck={false}
              />
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-2.5 border-t border-[#27272a] bg-[#16161b] flex items-center justify-between text-[11px] font-mono text-zinc-500 shrink-0">
          <div className="flex items-center gap-3">
            <span>语言格式: <strong className="text-blue-400 uppercase">{lang}</strong></span>
            <span>总行数: <strong className="text-zinc-300">{lines.length} 行</strong></span>
            <span>字符数: <strong className="text-zinc-300">{content.length}</strong></span>
          </div>

          <div className="flex items-center gap-2">
            {hasUnsavedChanges && (
              <span className="text-amber-400 font-sans text-xs">⚠️ 有未保存的修改</span>
            )}
            <button
              onClick={onClose}
              className="px-3 py-1 rounded-lg bg-[#27272a] hover:bg-[#3f3f46] text-white text-xs font-medium transition-all"
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
