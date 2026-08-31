import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Server,
  Folder,
  FolderOpen,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  Search,
  Layers,
  ChevronDown,
  ChevronUp,
  Sparkles
} from 'lucide-react';
import { api } from '../../api/client';
import { ProjectDirectory, ProjectEndpoint } from '../../types';

export const ProjectsOverview: React.FC = () => {
  const [directories, setDirectories] = useState<ProjectDirectory[]>([]);
  const [selectedDirId, setSelectedDirId] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isDirsExpanded, setIsDirsExpanded] = useState<boolean>(false);

  const showToast = (text: string) => {
    setToastMessage(text);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const loadDirectories = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const data = await api.getProjectDirectories();
      setDirectories(data);
      if (data.length > 0 && selectedDirId === null) {
        setSelectedDirId(data[0].id);
      }
    } catch (err: any) {
      console.error('Failed to load project directories:', err);
      showToast(`加载服务目录失败: ${err.message}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedDirId]);

  useEffect(() => {
    loadDirectories();
  }, [loadDirectories]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    showToast(`已复制到剪贴板: ${text}`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleOpenPath = async (path: string) => {
    try {
      await api.openSystemPath(path);
      showToast('已在 macOS 系统中打开对应目录');
    } catch (err: any) {
      showToast(`打开路径失败: ${err.message}`);
    }
  };

  const selectedDirectory = useMemo(() => {
    if (!selectedDirId && directories.length > 0) return directories[0];
    return directories.find((d) => d.id === selectedDirId) || null;
  }, [directories, selectedDirId]);

  const filteredServices = useMemo(() => {
    if (!selectedDirectory || !selectedDirectory.services) return [];
    if (!searchKeyword.trim()) return selectedDirectory.services;

    const kw = searchKeyword.toLowerCase();
    return selectedDirectory.services.filter(
      (s) =>
        s.name.toLowerCase().includes(kw) ||
        s.language.toLowerCase().includes(kw) ||
        (s.framework && s.framework.toLowerCase().includes(kw)) ||
        s.description.toLowerCase().includes(kw) ||
        s.role.toLowerCase().includes(kw) ||
        String(s.port).includes(kw) ||
        s.relative_path.toLowerCase().includes(kw)
    );
  }, [selectedDirectory, searchKeyword]);

  const getRoleBadge = (role: string) => {
    switch (role.toLowerCase()) {
      case 'backend':
        return {
          label: '后端服务',
          className: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
          dotColor: 'bg-sky-400',
        };
      case 'frontend':
        return {
          label: '前端界面',
          className: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
          dotColor: 'bg-purple-400',
        };
      case 'worker':
        return {
          label: '调度任务',
          className: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
          dotColor: 'bg-amber-400',
        };
      default:
        return {
          label: role,
          className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
          dotColor: 'bg-emerald-400',
        };
    }
  };

  const parseEndpoints = (raw?: string): ProjectEndpoint[] => {
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // not json
    }
    return [];
  };

  return (
    <div className="flex-1 max-w-[1920px] mx-auto p-4 sm:p-6 w-full space-y-6">
      {/* Toast alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#18181b] border border-blue-500/30 text-white px-4 py-2.5 rounded-lg shadow-xl shadow-black/50 text-xs flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <Sparkles className="w-4 h-4 text-blue-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-[#121215] border border-[#27272a] rounded-xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
                <Layers className="w-5 h-5" />
              </div>
              <h1 className="text-xl font-bold text-white tracking-tight">
                服务概览
              </h1>
              <span className="text-xs px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 font-mono font-medium">
                Workspace Projects
              </span>
            </div>
            <p className="text-xs text-[#a1a1aa] leading-relaxed">
              以工作区目录为维度，清晰列出各个目录下的前后端服务、端口映射、开发语言、实时运行状态与启动指令。
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-[#71717a] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="搜索项目/端口/语言..."
                className="w-48 sm:w-64 pl-9 pr-3 py-1.5 bg-[#18181b] border border-[#27272a] rounded-lg text-xs text-white placeholder-[#71717a] focus:outline-none focus:border-sky-500 transition-colors"
              />
            </div>

            <button
              onClick={() => loadDirectories(true)}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#18181b] hover:bg-[#27272a] border border-[#27272a] text-xs font-medium text-[#e4e4e7] hover:text-white transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-sky-400' : ''}`} />
              <span>刷新状态</span>
            </button>
          </div>
        </div>

        {/* Directory Selector - Default 1 row, Expandable downwards */}
        <div className="mt-5 pt-4 border-t border-[#27272a]/60 flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-[#a1a1aa] font-medium">
              <Folder className="w-3.5 h-3.5 text-sky-400" />
              <span>工作空间目录</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#27272a] text-[#71717a] font-mono">
                {directories.length} 个工作区
              </span>
            </div>

            {directories.length > 2 && (
              <button
                onClick={() => setIsDirsExpanded((prev) => !prev)}
                className="flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 font-medium px-2.5 py-1 rounded-md bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 transition-all cursor-pointer"
              >
                <span>{isDirsExpanded ? '收起目录' : `展开全部 (${directories.length})`}</span>
                {isDirsExpanded ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
            )}
          </div>

          <div
            className={`flex flex-wrap items-center gap-2 transition-all duration-300 ${
              isDirsExpanded ? 'max-h-none' : 'max-h-[38px] overflow-hidden'
            }`}
          >
            {directories.map((dir) => {
              const isSelected = selectedDirectory?.id === dir.id;
              return (
                <button
                  key={dir.id}
                  onClick={() => setSelectedDirId(dir.id)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all border ${
                    isSelected
                      ? 'bg-sky-500/15 text-sky-300 border-sky-500/40 shadow-sm shadow-sky-500/10 font-semibold'
                      : 'bg-[#18181b] text-[#a1a1aa] hover:text-white hover:bg-[#222226] border-[#27272a]'
                  }`}
                >
                  <Folder className={`w-3.5 h-3.5 ${isSelected ? 'text-sky-400' : 'text-[#71717a]'}`} />
                  <span>{dir.name}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                      isSelected
                        ? 'bg-sky-500/25 text-sky-200'
                        : 'bg-[#27272a] text-[#71717a]'
                    }`}
                  >
                    {dir.running_services || 0}/{dir.total_services || 0}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Directory Detail & Projects List */}
      {loading ? (
        <div className="bg-[#121215] border border-[#27272a] rounded-xl p-12 text-center text-xs text-[#71717a] flex flex-col items-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-sky-400" />
          <span>正在扫描加载工作空间服务...</span>
        </div>
      ) : !selectedDirectory ? (
        <div className="bg-[#121215] border border-[#27272a] rounded-xl p-12 text-center text-xs text-[#71717a]">
          暂未发现任何项目目录
        </div>
      ) : (
        <div className="space-y-4">
          {/* Current Workspace Meta Banner */}
          <div className="bg-[#121215] border border-[#27272a] rounded-xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white">
                  {selectedDirectory.name}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-[#27272a] text-[#a1a1aa] font-mono">
                  {selectedDirectory.category}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-[#71717a]">
                <FolderOpen className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span className="font-mono text-[#a1a1aa] break-all">
                  {selectedDirectory.path}
                </span>
                <button
                  onClick={() => handleCopy(selectedDirectory.path, `dir-${selectedDirectory.id}`)}
                  className="p-1 hover:text-white transition-colors"
                  title="复制绝对路径"
                >
                  {copiedKey === `dir-${selectedDirectory.id}` ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
              </div>
              <p className="text-xs text-[#a1a1aa] pt-1">
                {selectedDirectory.description}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleOpenPath(selectedDirectory.path)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#18181b] hover:bg-[#27272a] border border-[#27272a] text-xs text-[#e4e4e7] hover:text-white transition-all shadow-sm"
              >
                <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
                <span>在 Finder 中定位</span>
              </button>
            </div>
          </div>

          {/* Subprojects Table */}
          <div className="bg-[#121215] border border-[#27272a] rounded-xl overflow-hidden shadow-sm">
            <div className="px-5 py-3.5 border-b border-[#27272a] flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-white">
                <Server className="w-4 h-4 text-sky-400" />
                <span>子项目服务清单</span>
                <span className="text-[#71717a] font-normal">
                  (共 {filteredServices.length} 个服务)
                </span>
              </div>
            </div>

            {filteredServices.length === 0 ? (
              <div className="p-10 text-center text-xs text-[#71717a]">
                未匹配到符合条件的项目服务
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#27272a] bg-[#18181b]/50 text-[11px] font-semibold text-[#71717a] uppercase tracking-wider">
                      <th className="py-3 px-4">项目服务</th>
                      <th className="py-3 px-4">类型</th>
                      <th className="py-3 px-4">语言与技术栈</th>
                      <th className="py-3 px-4">端口</th>
                      <th className="py-3 px-4">状态</th>
                      <th className="py-3 px-4">项目功能简介</th>
                      <th className="py-3 px-4">启动与快捷指令</th>
                      <th className="py-3 px-4 text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#27272a]/60 text-xs">
                    {filteredServices.map((svc) => {
                      const roleBadge = getRoleBadge(svc.role);
                      const isRunning = svc.status === 'running';
                      const endpoints = parseEndpoints(svc.endpoints);
                      const cmd = svc.start_cmd || svc.dev_cmd || '';

                      return (
                        <tr
                          key={svc.id}
                          className="hover:bg-[#18181b]/40 transition-colors group"
                        >
                          {/* 1. Name & Relative Path */}
                          <td className="py-3.5 px-4">
                            <div className="space-y-1">
                              <div className="font-semibold text-white flex items-center gap-1.5">
                                {svc.name}
                              </div>
                              <div className="flex items-center gap-1 text-[11px] font-mono text-[#71717a]">
                                <span>{svc.relative_path}</span>
                                {svc.absolute_path && (
                                  <button
                                    onClick={() => handleCopy(svc.absolute_path!, `svc-path-${svc.id}`)}
                                    className="opacity-0 group-hover:opacity-100 hover:text-white transition-all"
                                    title="复制绝对路径"
                                  >
                                    {copiedKey === `svc-path-${svc.id}` ? (
                                      <Check className="w-3 h-3 text-emerald-400" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                  </button>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* 2. Role */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium border ${roleBadge.className}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${roleBadge.dotColor}`} />
                              {roleBadge.label}
                            </span>
                          </td>

                          {/* 3. Language & Framework */}
                          <td className="py-3.5 px-4">
                            <div className="space-y-1">
                              <span className="text-white font-medium block">
                                {svc.language}
                              </span>
                              {svc.framework && (
                                <span className="text-[11px] text-[#a1a1aa] block font-mono">
                                  {svc.framework}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* 4. Port */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {svc.port > 0 ? (
                              <div className="space-y-0.5">
                                <a
                                  href={`http://127.0.0.1:${svc.port}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 font-mono font-semibold text-sky-400 hover:underline hover:text-sky-300"
                                >
                                  :{svc.port}
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                                {svc.internal_port && svc.internal_port !== svc.port && (
                                  <div className="text-[10px] text-[#71717a] font-mono">
                                    容器内部: :{svc.internal_port}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-[#71717a] font-mono">-</span>
                            )}
                          </td>

                          {/* 5. Live Status */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {isRunning ? (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium text-[11px]">
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                                运行中
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#27272a] text-[#71717a] font-medium text-[11px]">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#52525b]" />
                                已停止
                              </span>
                            )}
                          </td>

                          {/* 6. Description */}
                          <td className="py-3.5 px-4 max-w-xs">
                            <p className="text-[#a1a1aa] text-xs leading-relaxed line-clamp-2" title={svc.description}>
                              {svc.description || '暂无描述'}
                            </p>
                          </td>

                          {/* 7. Start / Dev Command */}
                          <td className="py-3.5 px-4 max-w-sm">
                            {cmd ? (
                              <div className="flex items-center gap-1.5 bg-[#18181b] border border-[#27272a] rounded px-2 py-1 text-[11px] font-mono text-[#e4e4e7] group/cmd">
                                <span className="truncate flex-1" title={cmd}>
                                  {cmd}
                                </span>
                                <button
                                  onClick={() => handleCopy(cmd, `cmd-${svc.id}`)}
                                  className="text-[#71717a] hover:text-white transition-colors shrink-0"
                                  title="复制执行指令"
                                >
                                  {copiedKey === `cmd-${svc.id}` ? (
                                    <Check className="w-3 h-3 text-emerald-400" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                            ) : (
                              <span className="text-[#52525b] text-[11px]">-</span>
                            )}
                          </td>

                          {/* 8. Actions & Endpoints */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Open Endpoints */}
                              {endpoints.map((ep, idx) => (
                                <a
                                  key={idx}
                                  href={ep.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-2 py-1 rounded bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/20 text-[11px] inline-flex items-center gap-1 transition-all"
                                  title={ep.url}
                                >
                                  <span>{ep.label}</span>
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              ))}

                              {/* Open in Finder */}
                              {svc.absolute_path && (
                                <button
                                  onClick={() => handleOpenPath(svc.absolute_path!)}
                                  className="p-1.5 rounded hover:bg-[#27272a] text-[#a1a1aa] hover:text-white transition-colors"
                                  title="在 Finder 中打开此项目目录"
                                >
                                  <FolderOpen className="w-3.5 h-3.5" />
                                </button>
                              )}
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
        </div>
      )}
    </div>
  );
};
