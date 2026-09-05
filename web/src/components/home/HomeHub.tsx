import React, { useState, useEffect } from 'react';
import {
  Globe,
  KeyRound,
  Terminal,
  ExternalLink,
  Copy,
  Check,
  Eye,
  EyeOff,
  Sparkles,
  FolderOpen,
  ChevronDown,
  ChevronUp,
  Play,
  Loader2,
  X,
  RotateCcw,
  GripVertical
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
    script: [],
  });
  const [loading, setLoading] = useState(false);

  // Expanded state for each section
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    website: true,
    account: true,
    command: true,
    document: true,
    script: true,
  });

  const [revealedPasswords, setRevealedPasswords] = useState<Record<number, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // In-memory edited values for command and document sections (no database persistence required)
  const [editedValues, setEditedValues] = useState<Record<number, string>>({});

  // Drag and Drop state (strictly isolated per section, cannot drag across different sections)
  const [draggedItem, setDraggedItem] = useState<{
    section: keyof DashboardResponse;
    id: number;
    index: number;
  } | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<{
    section: keyof DashboardResponse;
    id: number;
    index: number;
  } | null>(null);

  const getItemValue = (item: DashboardItem) => {
    return editedValues[item.id] !== undefined ? editedValues[item.id] : item.content;
  };

  const isItemEdited = (item: DashboardItem) => {
    return editedValues[item.id] !== undefined && editedValues[item.id] !== item.content;
  };

  const handleResetItem = (id: number) => {
    setEditedValues((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    showToast('已恢复为默认初始值');
  };

  // Script execution states
  const [runningScriptId, setRunningScriptId] = useState<number | null>(null);
  const [executionResult, setExecutionResult] = useState<{
    id?: number;
    title: string;
    command: string;
    output: string;
    status: string;
    duration_ms: number;
    exit_code: number;
  } | null>(null);

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

  const handleRunScript = async (item: DashboardItem) => {
    setRunningScriptId(item.id);
    try {
      const res = await api.runDashboardItem(item.id);
      const result = res.data;
      if (result.status === 'success') {
        showToast(`✅ [${item.title}] 执行完成 (${result.duration_ms}ms)`);
      } else {
        showToast(`❌ [${item.title}] 执行异常 (退出码: ${result.exit_code})`);
      }
      setExecutionResult(result);
    } catch (err: any) {
      showToast(`执行失败: ${err.message}`);
    } finally {
      setRunningScriptId(null);
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
    const interval = setInterval(() => {
      api.getDashboardItems().then(setData).catch(() => {});
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  // Drag & Drop handlers with strict cross-section isolation
  const handleDragStart = (
    e: React.DragEvent,
    section: keyof DashboardResponse,
    item: DashboardItem,
    index: number
  ) => {
    setDraggedItem({ section, id: item.id, index });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', JSON.stringify({ section, id: item.id, index }));
  };

  const handleDragOver = (
    e: React.DragEvent,
    section: keyof DashboardResponse,
    item: DashboardItem,
    index: number
  ) => {
    // 严格限制：只能在同一板块内拖动，禁止跨板块拖动！
    if (!draggedItem || draggedItem.section !== section) {
      return;
    }
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!dragOverTarget || dragOverTarget.id !== item.id) {
      setDragOverTarget({ section, id: item.id, index });
    }
  };

  const handleDragLeave = (_e: React.DragEvent, section: keyof DashboardResponse, itemId: number) => {
    if (dragOverTarget?.id === itemId && dragOverTarget?.section === section) {
      setDragOverTarget(null);
    }
  };

  const handleDrop = async (
    e: React.DragEvent,
    section: keyof DashboardResponse,
    dropIndex: number
  ) => {
    e.preventDefault();
    if (!draggedItem || draggedItem.section !== section) {
      setDraggedItem(null);
      setDragOverTarget(null);
      return;
    }

    const fromIndex = draggedItem.index;
    if (fromIndex === dropIndex) {
      setDraggedItem(null);
      setDragOverTarget(null);
      return;
    }

    // 本地乐观重排
    const currentList = [...(data[section] || [])];
    const [moved] = currentList.splice(fromIndex, 1);
    currentList.splice(dropIndex, 0, moved);

    const updatedList = currentList.map((item, idx) => ({
      ...item,
      sort_order: idx + 1,
    }));

    setData((prev) => ({
      ...prev,
      [section]: updatedList,
    }));

    setDraggedItem(null);
    setDragOverTarget(null);

    // 持久化保存到数据库
    try {
      await api.reorderDashboardItems(section, updatedList.map((item) => item.id));
      showToast('排序已保存');
    } catch (err: any) {
      console.error('Failed to save reordered items:', err);
      showToast(`保存排序失败: ${err.message}`);
      loadData();
    }
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverTarget(null);
  };

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
            ({items.length} 项 · 可拖动卡片排序)
          </span>
        </div>

        {canExpand && (
          <button
            onClick={() => toggleSection(sectionKey)}
            className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-200 px-2 py-0.5 rounded-md hover:bg-[#18181b] transition-all cursor-pointer"
          >
            <span>{isExpanded ? '收起' : `展开剩余 ${items.length - 4} 项`}</span>
            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        )}
      </div>
    );
  };

  const getVisibleItems = (items: DashboardItem[] = [], sectionKey: string) => {
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
          {getVisibleItems(data.website, 'website').map((item, index) => {
            const isDragging = draggedItem?.id === item.id;
            const isDragOver = dragOverTarget?.id === item.id && dragOverTarget?.section === 'website';

            return (
              <div
                key={item.id}
                draggable
                onDragStart={(e) => handleDragStart(e, 'website', item, index)}
                onDragOver={(e) => handleDragOver(e, 'website', item, index)}
                onDragLeave={(e) => handleDragLeave(e, 'website', item.id)}
                onDrop={(e) => handleDrop(e, 'website', index)}
                onDragEnd={handleDragEnd}
                className={`group bg-[#121215] border rounded-xl p-3 flex items-center justify-between gap-2.5 transition-all cursor-grab active:cursor-grabbing ${
                  isDragging
                    ? 'opacity-30 border-dashed border-sky-500 scale-[0.98]'
                    : isDragOver
                    ? 'border-sky-500 ring-2 ring-sky-500/40 bg-sky-500/10 scale-[1.02]'
                    : item.is_online
                    ? 'border-[#27272a] hover:border-emerald-500/50 hover:shadow-[0_0_12px_rgba(16,185,129,0.08)]'
                    : 'border-[#27272a] hover:border-zinc-700 opacity-80'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {/* 拖动手柄指示 */}
                  <GripVertical className="w-3 h-3 text-zinc-600 group-hover:text-zinc-400 opacity-40 group-hover:opacity-100 transition-opacity shrink-0" />

                  {/* 状态指示绿点 */}
                  <div className="relative flex items-center justify-center shrink-0" title={item.is_online ? '已启动 (服务在线)' : '未启动'}>
                    {item.is_online ? (
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]"></span>
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full h-1.5 w-1.5 bg-zinc-600"></span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-zinc-100 truncate" title={item.title}>
                        {item.title}
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-zinc-500 truncate mt-0.5" title={item.content}>
                      {item.content}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0" onMouseDown={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => handleCopy(`web-${item.id}`, item.content, '链接')}
                    className="p-1.5 rounded-lg bg-[#18181b] hover:bg-[#27272a] text-zinc-400 hover:text-white border border-[#27272a] transition-all cursor-pointer"
                    title="复制链接"
                  >
                    {copiedId === `web-${item.id}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <a
                    href={item.content}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                      item.is_online
                        ? 'bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.15)]'
                        : 'bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border-blue-500/30'
                    }`}
                    title={item.is_online ? '服务已启动 - 点击打开' : '打开网站'}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 2. 常用账户密码 */}
      <section className="space-y-2.5">
        {renderSectionHeader(<KeyRound className="w-3.5 h-3.5 text-amber-400" />, '2. 常用账户密码', 'account')}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {getVisibleItems(data.account, 'account').map((item, index) => {
            const isDragging = draggedItem?.id === item.id;
            const isDragOver = dragOverTarget?.id === item.id && dragOverTarget?.section === 'account';

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
                draggable
                onDragStart={(e) => handleDragStart(e, 'account', item, index)}
                onDragOver={(e) => handleDragOver(e, 'account', item, index)}
                onDragLeave={(e) => handleDragLeave(e, 'account', item.id)}
                onDrop={(e) => handleDrop(e, 'account', index)}
                onDragEnd={handleDragEnd}
                className={`group bg-[#121215] border rounded-xl p-3 space-y-2 transition-all cursor-grab active:cursor-grabbing ${
                  isDragging
                    ? 'opacity-30 border-dashed border-sky-500 scale-[0.98]'
                    : isDragOver
                    ? 'border-sky-500 ring-2 ring-sky-500/40 bg-sky-500/10 scale-[1.02]'
                    : 'border-[#27272a] hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <GripVertical className="w-3 h-3 text-zinc-600 group-hover:text-zinc-400 opacity-40 group-hover:opacity-100 transition-opacity shrink-0" />
                    <span className="text-xs font-bold text-zinc-100 truncate" title={item.title}>
                      {item.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0" onMouseDown={(e) => e.stopPropagation()}>
                    <span className="text-[10px] font-mono text-zinc-500 truncate max-w-[100px]" title={host}>
                      {host}
                    </span>
                    {linkUrl && (
                      <a
                        href={linkUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 rounded bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 transition-all cursor-pointer"
                        title={`打开链接: ${linkUrl}`}
                      >
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                </div>

                <div
                  className="bg-[#18181b] p-2 rounded-lg border border-[#27272a] font-mono text-[11px] space-y-1.5 cursor-default"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-zinc-500 shrink-0 text-[10px]">{userLabel}</span>
                    <div className="flex items-center gap-1 min-w-0 flex-1 justify-end">
                      <span className="text-zinc-200 truncate select-all" title={username}>{username}</span>
                      <button
                        onClick={() => handleCopy(`user-${item.id}`, username, userLabel.replace(':', ''))}
                        className="text-zinc-500 hover:text-zinc-300 p-0.5 shrink-0 cursor-pointer"
                        title={`复制${userLabel.replace(':', '')}`}
                      >
                        {copiedId === `user-${item.id}` ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-zinc-500 shrink-0 text-[10px]">{pwdLabel}</span>
                    <div className="flex items-center gap-1 min-w-0 flex-1 justify-end">
                      <span className="text-amber-400 truncate select-all" title={isRevealed ? password : ''}>
                        {isRevealed ? password : '••••••••••••'}
                      </span>
                      <button
                        onClick={() => togglePasswordVisibility(item.id)}
                        className="text-zinc-500 hover:text-zinc-300 p-0.5 shrink-0 cursor-pointer"
                        title={isRevealed ? '隐藏密码' : '显示密码'}
                      >
                        {isRevealed ? <EyeOff className="w-2.5 h-2.5" /> : <Eye className="w-2.5 h-2.5" />}
                      </button>
                      <button
                        onClick={() => handleCopy(`pwd-${item.id}`, password, pwdLabel.replace(':', ''))}
                        className="text-zinc-500 hover:text-zinc-300 p-0.5 shrink-0 cursor-pointer"
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

      {/* 3. 常用执行命令 (支持即时修改后复制) */}
      <section className="space-y-2.5">
        {renderSectionHeader(<Terminal className="w-3.5 h-3.5 text-emerald-400" />, '3. 常用执行命令 (可修改后直接复制)', 'command')}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {getVisibleItems(data.command, 'command').map((item, index) => {
            const isDragging = draggedItem?.id === item.id;
            const isDragOver = dragOverTarget?.id === item.id && dragOverTarget?.section === 'command';

            const currentValue = getItemValue(item);
            const isEdited = isItemEdited(item);

            return (
              <div
                key={item.id}
                draggable
                onDragStart={(e) => handleDragStart(e, 'command', item, index)}
                onDragOver={(e) => handleDragOver(e, 'command', item, index)}
                onDragLeave={(e) => handleDragLeave(e, 'command', item.id)}
                onDrop={(e) => handleDrop(e, 'command', index)}
                onDragEnd={handleDragEnd}
                className={`group bg-[#121215] border rounded-xl p-3 flex flex-col justify-between gap-2.5 transition-all cursor-grab active:cursor-grabbing ${
                  isDragging
                    ? 'opacity-30 border-dashed border-sky-500 scale-[0.98]'
                    : isDragOver
                    ? 'border-sky-500 ring-2 ring-sky-500/40 bg-sky-500/10 scale-[1.02]'
                    : isEdited
                    ? 'border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.08)]'
                    : 'border-[#27272a] hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <GripVertical className="w-3 h-3 text-zinc-600 group-hover:text-zinc-400 opacity-40 group-hover:opacity-100 transition-opacity shrink-0" />
                    <span className="text-xs font-bold text-zinc-100 truncate" title={item.title}>
                      {item.title}
                    </span>
                    {isEdited && (
                      <span className="text-[9px] font-medium text-emerald-400 bg-emerald-400/10 px-1 py-0.5 rounded border border-emerald-400/20 shrink-0">
                        已修改
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0" onMouseDown={(e) => e.stopPropagation()}>
                    {isEdited && (
                      <button
                        onClick={() => handleResetItem(item.id)}
                        className="p-1 rounded hover:bg-[#27272a] text-zinc-400 hover:text-emerald-400 transition-all cursor-pointer"
                        title="恢复为默认命令"
                      >
                        <RotateCcw className="w-2.5 h-2.5" />
                      </button>
                    )}
                    <button
                      onClick={() => handleCopy(`cmd-${item.id}`, currentValue, '命令')}
                      className="px-1.5 py-0.5 rounded-md bg-[#18181b] hover:bg-[#27272a] text-zinc-300 hover:text-white border border-[#27272a] text-[10px] font-medium transition-all flex items-center gap-1 shrink-0 cursor-pointer"
                      title="复制当前输入框中的命令"
                    >
                      {copiedId === `cmd-${item.id}` ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5 text-blue-400" />}
                      <span>{copiedId === `cmd-${item.id}` ? '已复制' : '复制'}</span>
                    </button>
                  </div>
                </div>

                <div className="relative" onMouseDown={(e) => e.stopPropagation()}>
                  <input
                    type="text"
                    value={currentValue}
                    onChange={(e) =>
                      setEditedValues((prev) => ({
                        ...prev,
                        [item.id]: e.target.value,
                      }))
                    }
                    className="w-full bg-[#09090b] px-2.5 py-1.5 rounded-lg border border-[#27272a] focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 focus:outline-none font-mono text-[11px] text-emerald-400/95 transition-all select-all placeholder-zinc-600"
                    placeholder="可直接修改命令内容..."
                    title="可在此直接修改命令参数（如端口号），点击右上角复制即可执行"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. 常用文档与目录路径 (支持即时修改并打开所在目录) */}
      <section className="space-y-2.5">
        {renderSectionHeader(<FolderOpen className="w-3.5 h-3.5 text-purple-400" />, '4. 常用文档与目录路径 (可修改后打开所在目录)', 'document')}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {getVisibleItems(data.document, 'document').map((item, index) => {
            const isDragging = draggedItem?.id === item.id;
            const isDragOver = dragOverTarget?.id === item.id && dragOverTarget?.section === 'document';

            const currentValue = getItemValue(item);
            const isEdited = isItemEdited(item);

            return (
              <div
                key={item.id}
                draggable
                onDragStart={(e) => handleDragStart(e, 'document', item, index)}
                onDragOver={(e) => handleDragOver(e, 'document', item, index)}
                onDragLeave={(e) => handleDragLeave(e, 'document', item.id)}
                onDrop={(e) => handleDrop(e, 'document', index)}
                onDragEnd={handleDragEnd}
                className={`group bg-[#121215] border rounded-xl p-3 flex flex-col justify-between gap-2.5 transition-all cursor-grab active:cursor-grabbing ${
                  isDragging
                    ? 'opacity-30 border-dashed border-sky-500 scale-[0.98]'
                    : isDragOver
                    ? 'border-sky-500 ring-2 ring-sky-500/40 bg-sky-500/10 scale-[1.02]'
                    : isEdited
                    ? 'border-purple-500/50 shadow-[0_0_10px_rgba(168,85,247,0.08)]'
                    : 'border-[#27272a] hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <GripVertical className="w-3 h-3 text-zinc-600 group-hover:text-zinc-400 opacity-40 group-hover:opacity-100 transition-opacity shrink-0" />
                    <span className="text-xs font-bold text-zinc-100 truncate" title={item.title}>
                      {item.title}
                    </span>
                    {isEdited && (
                      <span className="text-[9px] font-medium text-purple-400 bg-purple-400/10 px-1 py-0.5 rounded border border-purple-400/20 shrink-0">
                        已修改
                      </span>
                    )}
                  </div>
                  {isEdited && (
                    <button
                      onClick={() => handleResetItem(item.id)}
                      onMouseDown={(e) => e.stopPropagation()}
                      className="p-1 rounded hover:bg-[#27272a] text-zinc-400 hover:text-purple-400 transition-all cursor-pointer shrink-0"
                      title="恢复为默认路径"
                    >
                      <RotateCcw className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>

                <div className="relative" onMouseDown={(e) => e.stopPropagation()}>
                  <input
                    type="text"
                    value={currentValue}
                    onChange={(e) =>
                      setEditedValues((prev) => ({
                        ...prev,
                        [item.id]: e.target.value,
                      }))
                    }
                    className="w-full bg-[#18181b] px-2.5 py-1.5 rounded-lg border border-[#27272a] focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/30 focus:outline-none font-mono text-[11px] text-purple-300 transition-all select-all placeholder-zinc-600"
                    placeholder="可直接修改目录路径..."
                    title="可在此直接修改路径，点击下方按钮可直接在访达中打开该修改后路径"
                  />
                </div>

                <div className="flex items-center gap-1.5 pt-0.5" onMouseDown={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => handleCopy(`doc-${item.id}`, currentValue, '路径')}
                    className="p-1.5 rounded-lg bg-[#18181b] hover:bg-[#27272a] text-zinc-400 hover:text-white border border-[#27272a] transition-all cursor-pointer shrink-0"
                    title="复制当前输入框中的路径"
                  >
                    {copiedId === `doc-${item.id}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => handleOpenFile(currentValue)}
                    className="flex-1 py-1.5 rounded-lg bg-purple-600/10 hover:bg-purple-600/20 text-purple-400 border border-purple-500/30 text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    title="在 macOS 访达 (Finder) 中打开当前输入框中的路径"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span>打开所在目录</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 5. 常用快捷脚本执行 (支持一键直接运行与查看日志) */}
      <section className="space-y-2.5">
        {renderSectionHeader(<Play className="w-3.5 h-3.5 text-rose-400" />, '5. 常用快捷脚本执行 (点击直接运行)', 'script')}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {getVisibleItems(data.script, 'script').map((item, index) => {
            const isDragging = draggedItem?.id === item.id;
            const isDragOver = dragOverTarget?.id === item.id && dragOverTarget?.section === 'script';

            return (
              <div
                key={item.id}
                draggable
                onDragStart={(e) => handleDragStart(e, 'script', item, index)}
                onDragOver={(e) => handleDragOver(e, 'script', item, index)}
                onDragLeave={(e) => handleDragLeave(e, 'script', item.id)}
                onDrop={(e) => handleDrop(e, 'script', index)}
                onDragEnd={handleDragEnd}
                className={`group bg-[#121215] border rounded-xl p-3 flex flex-col justify-between gap-2.5 transition-all cursor-grab active:cursor-grabbing ${
                  isDragging
                    ? 'opacity-30 border-dashed border-sky-500 scale-[0.98]'
                    : isDragOver
                    ? 'border-sky-500 ring-2 ring-sky-500/40 bg-sky-500/10 scale-[1.02]'
                    : 'border-[#27272a] hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <GripVertical className="w-3 h-3 text-zinc-600 group-hover:text-zinc-400 opacity-40 group-hover:opacity-100 transition-opacity shrink-0" />
                    <span className="text-xs font-bold text-zinc-100 truncate" title={item.title}>
                      {item.title}
                    </span>
                  </div>
                  <button
                    onClick={() => handleCopy(`script-${item.id}`, item.content, '命令')}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="p-1 rounded-md bg-[#18181b] hover:bg-[#27272a] text-zinc-400 hover:text-white border border-[#27272a] transition-all shrink-0 cursor-pointer"
                    title="复制脚本命令"
                  >
                    {copiedId === `script-${item.id}` ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
                  </button>
                </div>

                <div
                  className="bg-[#09090b] p-2 rounded-lg border border-[#27272a] font-mono text-[10px] text-zinc-400 truncate select-all leading-relaxed cursor-text"
                  title={item.content}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <code>{item.content}</code>
                </div>

                <div className="flex items-center gap-1.5 pt-0.5" onMouseDown={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => handleRunScript(item)}
                    disabled={runningScriptId === item.id}
                    className="flex-1 py-1.5 rounded-lg bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 border border-rose-500/30 text-xs font-medium transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                    title="在后台直接执行该脚本"
                  >
                    {runningScriptId === item.id ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>正在执行...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-rose-400/20" />
                        <span>运行脚本</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 脚本执行日志与结果输出弹窗 */}
      {executionResult && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setExecutionResult(null)}
        >
          <div
            className="bg-[#121215] border border-[#27272a] rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-[#27272a] bg-[#18181b]/50">
              <div className="flex items-center gap-2.5 min-w-0">
                <Terminal className="w-4 h-4 text-emerald-400 shrink-0" />
                <h3 className="text-sm font-bold text-white truncate">{executionResult.title}</h3>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${
                    executionResult.status === 'success'
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                  }`}
                >
                  {executionResult.status === 'success' ? '执行成功' : '执行失败'}
                </span>
                <span className="text-[11px] font-mono text-zinc-500 shrink-0">
                  {executionResult.duration_ms} ms
                </span>
              </div>
              <button
                onClick={() => setExecutionResult(null)}
                className="p-1 rounded-lg hover:bg-[#27272a] text-zinc-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 overflow-y-auto flex-1 font-mono text-xs">
              <div>
                <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider">执行指令</span>
                <div className="bg-[#09090b] p-2.5 rounded-lg border border-[#27272a] text-zinc-300 mt-1 break-all select-all">
                  {executionResult.command}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider">标准控制台输出</span>
                  {executionResult.output && (
                    <button
                      onClick={() => handleCopy('modal-output', executionResult.output, '日志输出')}
                      className="text-[11px] text-zinc-400 hover:text-white flex items-center gap-1 cursor-pointer"
                    >
                      {copiedId === 'modal-output' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>复制输出</span>
                    </button>
                  )}
                </div>
                <pre className="bg-black p-3 rounded-lg border border-[#27272a] text-emerald-400/90 mt-1 max-h-80 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                  {executionResult.output || '(无标准输出)'}
                </pre>
              </div>
            </div>

            <div className="p-3 border-t border-[#27272a] bg-[#18181b]/30 flex justify-end gap-2">
              <button
                onClick={() => setExecutionResult(null)}
                className="px-4 py-1.5 rounded-lg bg-[#27272a] hover:bg-[#3f3f46] text-white text-xs font-medium transition-all cursor-pointer"
              >
                关闭窗口
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
