import React, { useState, useEffect } from 'react';
import {
  Globe,
  KeyRound,
  Terminal,
  Folder,
  FileText,
  ExternalLink,
  Copy,
  Check,
  Eye,
  EyeOff,
  Sparkles,
  FolderOpen,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { api } from '../../api/client';
import { DashboardItem, DashboardResponse } from '../../types';

export const HomeHub: React.FC = () => {
  const [data, setData] = useState<DashboardResponse>({
    website: [],
    account: [],
    command: [],
    path: [],
    document: [],
  });
  const [loading, setLoading] = useState(false);

  // Expanded state for each section (default false = show first 4 items)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    website: false,
    account: false,
    command: false,
    path: false,
    document: false,
  });

  const [revealedPasswords, setRevealedPasswords] = useState<Record<number, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (text: string) => {
    setToastMessage(text);
    setTimeout(() => setToastMessage(null), 1800);
  };

  const handleCopy = async (id: string, text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast(`${label}已复制`);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const togglePasswordVisibility = (id: number) => {
    setRevealedPasswords((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleOpenFile = async (filePath: string) => {
    try {
      await api.openSystemPath(filePath);
      showToast('已在访达 (Finder) 中打开所在目录');
    } catch (err: any) {
      showToast(`打开失败: ${err.message}`);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.getDashboardItems();
      setData(res);
    } catch (err) {
      console.error('Failed to load dashboard items:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const renderSectionHeader = (
    icon: React.ReactNode,
    title: string,
    sectionKey: keyof DashboardResponse
  ) => {
    const items = data[sectionKey] || [];
    const isExpanded = expandedSections[sectionKey];
    const canExpand = items.length > 4;

    return (
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold text-zinc-300">
          {icon}
          <span>{title}</span>
          <span className="text-[10px] font-mono text-zinc-500 font-normal">
            ({items.length} 项)
          </span>
        </div>

        {canExpand && (
          <button
            onClick={() => toggleSection(sectionKey)}
            className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-200 px-2 py-0.5 rounded-md hover:bg-[#18181b] transition-all"
          >
            <span>{isExpanded ? '收起' : `展开剩余 ${items.length - 4} 项`}</span>
            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        )}
      </div>
    );
  };

  const getVisibleItems = (items: DashboardItem[], sectionKey: string) => {
    if (expandedSections[sectionKey]) {
      return items;
    }
    return items.slice(0, 4);
  };

  return (
    <div className="flex-1 flex flex-col bg-[#09090b] text-[#f4f4f5] overflow-y-auto w-full select-none p-6 space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 right-8 z-50 px-3.5 py-1.5 rounded-xl text-xs font-medium bg-[#1c1c22] text-white border border-emerald-500/40 shadow-2xl flex items-center gap-2 animate-in fade-in duration-150">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {loading && (
        <div className="text-center py-4 text-xs text-zinc-500">正在从数据库同步习惯配置...</div>
      )}

      {/* 1. 常用网站跳转 */}
      <section className="space-y-2.5">
        {renderSectionHeader(<Globe className="w-3.5 h-3.5 text-blue-400" />, '1. 常用网站跳转', 'website')}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {getVisibleItems(data.website, 'website').map((item) => (
            <div
              key={item.id}
              className="bg-[#121215] border border-[#27272a] hover:border-zinc-700 rounded-xl p-3 flex items-center justify-between gap-2 transition-all"
            >
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-zinc-100 truncate">{item.title}</div>
                <div className="text-[11px] font-mono text-zinc-500 truncate mt-0.5">{item.content}</div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => handleCopy(`web-${item.id}`, item.content, '链接')}
                  className="p-1.5 rounded-lg bg-[#18181b] hover:bg-[#27272a] text-zinc-400 hover:text-white border border-[#27272a] transition-all"
                  title="复制链接"
                >
                  {copiedId === `web-${item.id}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <a
                  href={item.content}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/30 transition-all"
                  title="打开网站"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 2. 常用账户密码 */}
      <section className="space-y-2.5">
        {renderSectionHeader(<KeyRound className="w-3.5 h-3.5 text-amber-400" />, '2. 常用账户密码', 'account')}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {getVisibleItems(data.account, 'account').map((item) => {
            const isRevealed = !!revealedPasswords[item.id];
            let username = 'root';
            let password = '';
            let host = item.content;
            let userLabel = '账号:';
            let pwdLabel = '密码:';
            let linkUrl: string | null = null;

            if (item.extra) {
              try {
                const parsed = JSON.parse(item.extra);
                username = parsed.username || username;
                password = parsed.password || password;
                host = parsed.host || host;
                if (parsed.user_label) userLabel = parsed.user_label + ':';
                if (parsed.pwd_label) pwdLabel = parsed.pwd_label + ':';
                if (parsed.url) linkUrl = parsed.url;
              } catch {}
            }

            if (!linkUrl && item.content.startsWith('http')) {
              linkUrl = item.content;
            }

            return (
              <div
                key={item.id}
                className="bg-[#121215] border border-[#27272a] hover:border-zinc-700 rounded-xl p-3 space-y-2 transition-all"
              >
                <div className="flex items-center justify-between gap-1.5">
                  <span className="text-xs font-bold text-zinc-100 truncate" title={item.title}>
                    {item.title}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[10px] font-mono text-zinc-500 truncate max-w-[100px]" title={host}>
                      {host}
                    </span>
                    {linkUrl && (
                      <a
                        href={linkUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 rounded bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 transition-all"
                        title={`打开链接: ${linkUrl}`}
                      >
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                </div>

                <div className="bg-[#18181b] p-2 rounded-lg border border-[#27272a] font-mono text-[11px] space-y-1.5">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-zinc-500 shrink-0 text-[10px]">{userLabel}</span>
                    <div className="flex items-center gap-1 min-w-0 flex-1 justify-end">
                      <span className="text-zinc-200 truncate" title={username}>{username}</span>
                      <button
                        onClick={() => handleCopy(`user-${item.id}`, username, userLabel.replace(':', ''))}
                        className="text-zinc-500 hover:text-zinc-300 p-0.5 shrink-0"
                        title={`复制${userLabel.replace(':', '')}`}
                      >
                        {copiedId === `user-${item.id}` ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-zinc-500 shrink-0 text-[10px]">{pwdLabel}</span>
                    <div className="flex items-center gap-1 min-w-0 flex-1 justify-end">
                      <span className="text-amber-400 truncate" title={isRevealed ? password : ''}>
                        {isRevealed ? password : '••••••••••••'}
                      </span>
                      <button
                        onClick={() => togglePasswordVisibility(item.id)}
                        className="text-zinc-500 hover:text-zinc-300 p-0.5 shrink-0"
                        title={isRevealed ? '隐藏密码' : '显示密码'}
                      >
                        {isRevealed ? <EyeOff className="w-2.5 h-2.5" /> : <Eye className="w-2.5 h-2.5" />}
                      </button>
                      <button
                        onClick={() => handleCopy(`pwd-${item.id}`, password, pwdLabel.replace(':', ''))}
                        className="text-zinc-500 hover:text-zinc-300 p-0.5 shrink-0"
                        title={`复制${pwdLabel.replace(':', '')}`}
                      >
                        {copiedId === `pwd-${item.id}` ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. 常用执行命令 (一行4个) */}
      <section className="space-y-2.5">
        {renderSectionHeader(<Terminal className="w-3.5 h-3.5 text-emerald-400" />, '3. 常用执行命令', 'command')}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {getVisibleItems(data.command, 'command').map((item) => (
            <div
              key={item.id}
              className="bg-[#121215] border border-[#27272a] hover:border-zinc-700 rounded-xl p-3 flex flex-col justify-between gap-2 transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-100 truncate">{item.title}</span>
                <button
                  onClick={() => handleCopy(`cmd-${item.id}`, item.content, '命令')}
                  className="px-1.5 py-0.5 rounded-md bg-[#18181b] hover:bg-[#27272a] text-zinc-300 hover:text-white border border-[#27272a] text-[10px] font-medium transition-all flex items-center gap-1 shrink-0"
                >
                  {copiedId === `cmd-${item.id}` ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5 text-blue-400" />}
                  <span>{copiedId === `cmd-${item.id}` ? '已复制' : '复制'}</span>
                </button>
              </div>
              <div className="bg-[#09090b] p-2 rounded-lg border border-[#27272a] font-mono text-[10px] text-emerald-400/90 truncate leading-relaxed" title={item.content}>
                <code>{item.content}</code>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. 常用本地路径 */}
      <section className="space-y-2.5">
        {renderSectionHeader(<Folder className="w-3.5 h-3.5 text-sky-400" />, '4. 常用本地路径 (用来复制用)', 'path')}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {getVisibleItems(data.path, 'path').map((item) => (
            <div
              key={item.id}
              className="bg-[#121215] border border-[#27272a] hover:border-zinc-700 rounded-xl p-3 space-y-2 transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-100 truncate" title={item.title}>
                  {item.title}
                </span>
              </div>
              <div className="bg-[#18181b] p-2 rounded-lg border border-[#27272a] flex items-center justify-between gap-2">
                <span
                  className="font-mono text-[11px] text-sky-300 truncate select-all flex-1 cursor-pointer hover:text-sky-200 transition-colors"
                  title={`${item.content} (点击复制)`}
                  onClick={() => handleCopy(`path-${item.id}`, item.content, '路径')}
                >
                  {item.content}
                </span>
                <button
                  onClick={() => handleCopy(`path-${item.id}`, item.content, '路径')}
                  className="p-1 rounded hover:bg-[#27272a] text-zinc-400 hover:text-white transition-all shrink-0"
                  title="复制路径"
                >
                  {copiedId === `path-${item.id}` ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-sky-400" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. 常用文档路径 */}
      <section className="space-y-2.5">
        {renderSectionHeader(<FileText className="w-3.5 h-3.5 text-purple-400" />, '5. 常用文档路径 (点击打开所在目录)', 'document')}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {getVisibleItems(data.document, 'document').map((item) => (
            <div
              key={item.id}
              className="bg-[#121215] border border-[#27272a] hover:border-zinc-700 rounded-xl p-3 flex flex-col justify-between gap-2 transition-all"
            >
              <div className="text-xs font-bold text-zinc-100 truncate" title={item.title}>
                {item.title}
              </div>
              <div className="bg-[#18181b] p-2 rounded-lg border border-[#27272a] font-mono text-[10px] text-purple-300 truncate" title={item.content}>
                {item.content}
              </div>
              <div className="flex items-center gap-1.5 pt-1">
                <button
                  onClick={() => handleCopy(`doc-${item.id}`, item.content, '文档路径')}
                  className="p-1.5 rounded-lg bg-[#18181b] hover:bg-[#27272a] text-zinc-400 hover:text-white border border-[#27272a] transition-all"
                  title="复制路径"
                >
                  {copiedId === `doc-${item.id}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => handleOpenFile(item.content)}
                  className="flex-1 py-1.5 rounded-lg bg-purple-600/10 hover:bg-purple-600/20 text-purple-400 border border-purple-500/30 text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  title="在 macOS Finder 中打开文件所在目录"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span>打开所在目录</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
