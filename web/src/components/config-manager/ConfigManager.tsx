import React, { useState, useEffect, useCallback } from 'react';
import {
  Cpu,
  RefreshCw,
  Search,
  Check,
  Copy,
  FolderOpen,
  Sparkles,
  FileCode,
  Terminal,
  Activity,
  RotateCw
} from 'lucide-react';
import { api } from '../../api/client';
import { ServiceConfig } from '../../types';
import { ConfigFileModal } from './ConfigFileModal';

const getServiceTypeBadge = (type: string) => {
  switch (type) {
    case 'brew_service':
      return {
        label: 'Homebrew 服务',
        className: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      };
    case 'docker':
      return {
        label: 'Docker 容器',
        className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      };
    case 'script':
      return {
        label: '后台脚本',
        className: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      };
    case 'host_process':
    default:
      return {
        label: '宿主机进程',
        className: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
      };
  }
};

export const ConfigManager: React.FC = () => {
  const [services, setServices] = useState<ServiceConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  // Selected Service for Config File Modal
  const [selectedService, setSelectedService] = useState<ServiceConfig | null>(null);

  const showToast = (text: string) => {
    setToastMessage(text);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const loadServices = useCallback(async () => {
    setLoading(true);
    try {
      const list = await api.getServiceConfigs();
      setServices(list);
    } catch (err: any) {
      console.error('Failed to load service configs:', err);
      showToast(`加载服务列表失败: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  const handleAction = async (service: ServiceConfig, action: 'start' | 'stop' | 'restart') => {
    setActionLoadingId(service.id);
    try {
      const res = await api.executeServiceAction(service.id, action);
      showToast(`✅ ${res.message}`);
      // Update local state with new status
      setServices((prev) =>
        prev.map((s) => (s.id === service.id ? { ...s, ...res.data } : s))
      );
    } catch (err: any) {
      showToast(`执行 ${action} 失败: ${err.message}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleOpenLocalPath = async (path: string) => {
    try {
      await api.openSystemPath(path);
      showToast('已在 macOS 系统中打开对应文件');
    } catch (err: any) {
      showToast(`打开失败: ${err.message}`);
    }
  };

  const handleCopyPath = async (id: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast('路径已复制到剪贴板');
    setTimeout(() => setCopiedId(null), 1800);
  };

  // Filtered Services
  const filteredServices = services.filter((s) => {
    if (!searchKeyword) return true;
    const kw = searchKeyword.toLowerCase();
    return (
      s.name.toLowerCase().includes(kw) ||
      s.slug.toLowerCase().includes(kw) ||
      s.description.toLowerCase().includes(kw) ||
      s.process_pattern.toLowerCase().includes(kw) ||
      s.config_path.toLowerCase().includes(kw) ||
      String(s.port).includes(kw)
    );
  });

  const runningCount = services.filter((s) => s.status === 'running').length;
  const configExistsCount = services.filter((s) => s.config_file_exists).length;

  return (
    <div className="flex-1 flex flex-col bg-[#09090b] text-[#f4f4f5] overflow-hidden select-none h-full">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 right-8 z-50 px-4 py-2 rounded-xl text-xs font-medium bg-[#1c1c22] text-white border border-emerald-500/40 shadow-2xl flex items-center gap-2 animate-in fade-in duration-150">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Banner & Header */}
      <div className="px-6 py-4 border-b border-[#27272a] bg-gradient-to-r from-[#0e0e12] via-[#121217] to-[#0e0e12] shrink-0">
        <div className="max-w-[1920px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-600/10 border border-purple-500/20 flex items-center justify-center text-purple-400 font-bold shadow-sm">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-white tracking-tight">脚本与中间件管理</h1>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 font-mono">
                  Scripts & Middleware
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                实时监听本地 PostgreSQL、Redis、MinIO、Nacos、Elasticsearch、MySQL 与后台脚本运行状态，支持关联配置文件查看、语法高亮与在线修改保存
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Stats */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#18181b] border border-[#27272a] text-xs font-mono">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-zinc-400">运行状态:</span>
              <span className="text-emerald-400 font-bold">{runningCount} 运行中</span>
              <span className="text-zinc-600">/</span>
              <span className="text-zinc-400">{services.length} 总服务</span>
              <span className="text-zinc-600">|</span>
              <span className="text-purple-400">{configExistsCount} 个配置就绪</span>
            </div>

            <button
              onClick={loadServices}
              disabled={loading}
              className="p-2 rounded-xl bg-[#18181b] hover:bg-[#27272a] text-zinc-400 hover:text-white border border-[#27272a] transition-all flex items-center gap-1.5 text-xs"
              title="刷新全部服务状态"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-400' : ''}`} />
              <span>刷新状态</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area (Direct Full-Width List) */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 max-w-[1920px] mx-auto w-full">
        {/* Search & Filter Toolbar */}
        <div className="flex items-center justify-between gap-4">
          <div className="relative w-full sm:w-96">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="搜索服务名称、进程关键词、端口或配置路径..."
              className="w-full h-9 pl-9 pr-3 rounded-xl bg-[#121215] border border-[#27272a] text-xs text-white placeholder:text-zinc-500 outline-none focus:border-blue-500 transition-all font-mono"
            />
          </div>

          <div className="text-xs text-zinc-500 font-mono hidden sm:block">
            共 <strong className="text-zinc-300">{filteredServices.length}</strong> 项服务记录
          </div>
        </div>

        {/* Services Table */}
        <div className="bg-[#121215] border border-[#27272a] rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#27272a] bg-[#16161b]/80 text-zinc-400 font-medium">
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4">服务 / 脚本名称</th>
                  <th className="py-3 px-4">实时运行状态</th>
                  <th className="py-3 px-4">服务类型</th>
                  <th className="py-3 px-4">监听端口</th>
                  <th className="py-3 px-4">关联配置文件路径</th>
                  <th className="py-3 px-4 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#27272a]/60">
                {loading && services.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-zinc-500">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto text-blue-400 mb-2" />
                      正在检测宿主机进程与服务状态...
                    </td>
                  </tr>
                ) : filteredServices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-zinc-500">
                      暂无匹配的服务记录
                    </td>
                  </tr>
                ) : (
                  filteredServices.map((svc, idx) => {
                    const isRunning = svc.status === 'running';
                    const typeBadge = getServiceTypeBadge(svc.service_type);
                    const isActing = actionLoadingId === svc.id;

                    return (
                      <tr
                        key={svc.id}
                        className="hover:bg-[#18181b]/50 transition-colors group cursor-pointer"
                        onClick={() => setSelectedService(svc)}
                      >
                        {/* Index */}
                        <td className="py-3.5 px-4 text-center font-mono text-zinc-500 text-[11px]">
                          {idx + 1}
                        </td>

                        {/* Name & Description */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`p-2 rounded-lg border shrink-0 ${
                              isRunning
                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                : 'bg-[#18181b] border-[#27272a] text-zinc-500'
                            }`}>
                              <Terminal className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-white group-hover:text-blue-400 transition-colors flex items-center gap-2">
                                <span className="truncate max-w-xs">{svc.name}</span>
                                <span className="text-[9px] px-1 py-0.5 rounded bg-[#18181b] border border-[#27272a] font-mono text-zinc-400">
                                  {svc.slug}
                                </span>
                              </div>
                              <div className="text-[11px] text-zinc-400 mt-0.5 truncate max-w-md">
                                {svc.description}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Live Status (🟢 Running / 🔴 Stopped) */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {isRunning ? (
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                <span className="text-emerald-400 font-bold text-xs">运行中</span>
                                <span className="text-[10px] font-mono text-zinc-400 bg-[#18181b] px-1.5 py-0.2 rounded border border-[#27272a]">
                                  PID: {svc.pid}
                                </span>
                              </div>
                              <div className="text-[10px] font-mono text-zinc-500 flex items-center gap-2 pl-3.5">
                                <span>Mem: {(svc.memory_mb).toFixed(1)} MB</span>
                                {svc.cpu_percent > 0 && <span>CPU: {svc.cpu_percent.toFixed(1)}%</span>}
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-zinc-500">
                              <span className="w-2 h-2 rounded-full bg-zinc-600" />
                              <span>未启动</span>
                            </div>
                          )}
                        </td>

                        {/* Service Type */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className={`text-[10px] px-2 py-0.5 rounded border font-medium ${typeBadge.className}`}>
                            {typeBadge.label}
                          </span>
                        </td>

                        {/* Port */}
                        <td className="py-3.5 px-4 font-mono text-zinc-300 text-[11px] whitespace-nowrap">
                          {svc.port > 0 ? (
                            <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold">
                              :{svc.port}
                            </span>
                          ) : (
                            <span className="text-zinc-600">-</span>
                          )}
                        </td>

                        {/* Config Path & Existence */}
                        <td className="py-3.5 px-4 font-mono text-zinc-400 text-[11px]">
                          <div className="flex items-center gap-1.5">
                            {svc.config_file_exists ? (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                                存在
                              </span>
                            ) : (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 shrink-0">
                                缺失
                              </span>
                            )}
                            <span className="truncate max-w-[240px] text-zinc-400 group-hover:text-zinc-200 transition-colors" title={svc.config_path}>
                              {svc.config_path}
                            </span>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            {/* View / Edit Config Button */}
                            <button
                              onClick={() => setSelectedService(svc)}
                              className="px-2.5 py-1 rounded-lg bg-sky-600/10 hover:bg-sky-600/20 text-sky-400 border border-sky-500/30 text-xs font-medium transition-all flex items-center gap-1"
                              title="查看与在线编辑配置文件"
                            >
                              <FileCode className="w-3 h-3" />
                              <span>查看配置</span>
                            </button>

                            {/* Start / Stop / Restart Control */}
                            {svc.restart_cmd && (
                              <button
                                onClick={() => handleAction(svc, 'restart')}
                                disabled={isActing}
                                className="p-1.5 rounded-lg bg-purple-600/10 hover:bg-purple-600/20 text-purple-400 border border-purple-500/30 transition-all disabled:opacity-50"
                                title="重启服务"
                              >
                                <RotateCw className={`w-3.5 h-3.5 ${isActing ? 'animate-spin' : ''}`} />
                              </button>
                            )}

                            {/* Open in macOS Native Application */}
                            <button
                              onClick={() => handleOpenLocalPath(svc.config_path)}
                              className="p-1.5 rounded-lg bg-[#18181b] hover:bg-[#27272a] text-zinc-400 hover:text-white border border-[#27272a] transition-all"
                              title="在 macOS 默认应用中打开"
                            >
                              <FolderOpen className="w-3.5 h-3.5" />
                            </button>

                            {/* Copy Path */}
                            <button
                              onClick={() => handleCopyPath(`path-${svc.id}`, svc.config_path)}
                              className="p-1.5 rounded-lg bg-[#18181b] hover:bg-[#27272a] text-zinc-400 hover:text-white border border-[#27272a] transition-all"
                              title="复制完整路径"
                            >
                              {copiedId === `path-${svc.id}` ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Config File Modal */}
      {selectedService && (
        <ConfigFileModal
          service={selectedService}
          onClose={() => setSelectedService(null)}
          onRefreshNeeded={loadServices}
        />
      )}
    </div>
  );
};
