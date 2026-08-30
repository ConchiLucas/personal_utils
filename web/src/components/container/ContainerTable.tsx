import React, { useState } from 'react';
import { 
  ExternalLink, 
  FileText, 
  RotateCw, 
  Square, 
  Play, 
  Copy, 
  Check, 
  Globe, 
  Activity, 
  Server, 
  Box
} from 'lucide-react';
import { ContainerInfo } from '../../types';

interface ContainerTableProps {
  containers: ContainerInfo[];
  workspaceName: string;
  onOpenLogs: (container: ContainerInfo) => void;
  onAction: (containerId: string, action: 'start' | 'stop' | 'restart') => void;
  actionLoadingId: string | null;
}

export const ContainerTable: React.FC<ContainerTableProps> = ({
  containers,
  workspaceName,
  onOpenLogs,
  onAction,
  actionLoadingId,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'running' | 'web' | 'stopped'>('all');

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const filteredContainers = containers.filter((c) => {
    if (statusFilter === 'running') return c.state === 'running';
    if (statusFilter === 'stopped') return c.state !== 'running';
    if (statusFilter === 'web') return c.web_port != null;
    return true;
  });

  const total = containers.length;
  const running = containers.filter((c) => c.state === 'running').length;
  const webCount = containers.filter((c) => c.web_port != null).length;
  const stopped = total - running;

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#09090b] overflow-hidden">
      {/* Top Metric Cards */}
      <div className="p-4 sm:p-6 pb-2 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <div className="text-[11px] text-[#71717a] font-medium">工作空间容器总量</div>
            <div className="text-xl font-bold text-white font-mono mt-0.5">{total}</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Box className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <div className="text-[11px] text-[#71717a] font-medium">运行中 (Running)</div>
            <div className="text-xl font-bold text-emerald-400 font-mono mt-0.5">{running}</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Activity className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <div className="text-[11px] text-[#71717a] font-medium">Web / 前端服务</div>
            <div className="text-xl font-bold text-sky-400 font-mono mt-0.5">{webCount}</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
            <Globe className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <div className="text-[11px] text-[#71717a] font-medium">已退出 / 异常</div>
            <div className="text-xl font-bold text-[#a1a1aa] font-mono mt-0.5">{stopped}</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-zinc-500/10 border border-zinc-500/20 flex items-center justify-center text-[#71717a]">
            <Server className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Filter and Title Bar */}
      <div className="px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 border-b border-[#27272a]">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
            <span>{workspaceName}</span>
            <span className="text-xs font-normal text-[#71717a]">
              (共 {filteredContainers.length} 个实例)
            </span>
          </h2>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 bg-[#18181b] p-0.5 rounded-lg border border-[#27272a]">
          {[
            { id: 'all', label: `全部 (${total})` },
            { id: 'running', label: `运行中 (${running})` },
            { id: 'web', label: `Web服务 (${webCount})` },
            { id: 'stopped', label: `已停止 (${stopped})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id as any)}
              className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all ${
                statusFilter === tab.id
                  ? 'bg-[#27272a] text-white shadow-sm'
                  : 'text-[#71717a] hover:text-[#f4f4f5]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Container Data Table */}
      <div className="flex-1 overflow-auto px-4 sm:px-6 py-3">
        {filteredContainers.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-[#71717a] border border-dashed border-[#27272a] rounded-xl">
            <Box className="w-8 h-8 mb-2 opacity-40" />
            <p className="text-xs">该工作空间下暂无符合条件的容器实例</p>
          </div>
        ) : (
          <div className="border border-[#27272a] rounded-xl overflow-hidden shadow-sm bg-[#0d0d10]">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#18181b]/80 border-b border-[#27272a] text-[#a1a1aa] font-medium select-none">
                  <th className="py-3 px-4 w-28">状态 (Status)</th>
                  <th className="py-3 px-4">容器名称 / ID</th>
                  <th className="py-3 px-4">镜像 (Image)</th>
                  <th className="py-3 px-4 min-w-[220px]">端口映射与前端直达</th>
                  <th className="py-3 px-4 w-36">运行时间 (Uptime)</th>
                  <th className="py-3 px-4 text-right w-44">快捷操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#27272a]/50 font-mono text-[11px]">
                {filteredContainers.map((container) => {
                  const isRunning = container.state === 'running';
                  const isHealthy = container.status.includes('healthy');
                  const isLoading = actionLoadingId === container.id;

                  return (
                    <tr
                      key={container.id}
                      className="hover:bg-[#18181b]/60 transition-colors group"
                    >
                      {/* Status */}
                      <td className="py-3.5 px-4 font-sans">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                              isRunning
                                ? isHealthy
                                  ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]'
                                  : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                                : 'bg-zinc-600'
                            }`}
                          />
                          <span
                            className={`text-xs font-medium ${
                              isRunning ? 'text-emerald-400' : 'text-[#71717a]'
                            }`}
                          >
                            {isRunning ? (isHealthy ? 'Healthy' : 'Running') : 'Exited'}
                          </span>
                        </div>
                      </td>

                      {/* Name & ID */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <div className="font-semibold text-xs text-white font-sans flex items-center gap-1.5">
                            {container.name}
                          </div>
                          <div className="flex items-center gap-1 text-[10px] text-[#71717a] mt-0.5">
                            <span>{container.short_id}</span>
                            <button
                              onClick={() => handleCopy(container.id, container.id)}
                              className="hover:text-[#a1a1aa] transition-colors"
                              title="复制完整容器ID"
                            >
                              {copiedId === container.id ? (
                                <Check className="w-2.5 h-2.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-2.5 h-2.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Image */}
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded bg-[#18181b] border border-[#27272a] text-[#a1a1aa] text-[11px] truncate max-w-[200px] inline-block">
                          {container.image_tag || container.image}
                        </span>
                      </td>

                      {/* Port Mappings & Web Jump */}
                      <td className="py-3.5 px-4 font-sans">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {/* Primary Web Quick Jump Button */}
                          {container.web_port && isRunning && (
                            <a
                              href={container.web_port.direct_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-600/15 hover:bg-blue-600/25 border border-blue-500/30 text-blue-400 hover:text-blue-300 text-xs font-medium transition-all shadow-sm group/btn"
                            >
                              <span>打开前端</span>
                              <span className="font-mono text-[10px] opacity-80">
                                :{container.web_port.public_port}
                              </span>
                              <ExternalLink className="w-3 h-3 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                            </a>
                          )}

                          {/* Other Port Chips */}
                          {container.ports.map((p, idx) => {
                            if (container.web_port && p.public_port === container.web_port.public_port) {
                              return null; // Already shown in Web Jump
                            }
                            return (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#18181b] border border-[#27272a] text-[10px] font-mono text-[#a1a1aa]"
                              >
                                {p.public_port ? `${p.public_port}→${p.private_port}` : `${p.private_port}`}
                              </span>
                            );
                          })}

                          {container.ports.length === 0 && (
                            <span className="text-[11px] text-[#52525b]">无映射端口</span>
                          )}
                        </div>
                      </td>

                      {/* Uptime */}
                      <td className="py-3.5 px-4 text-[#a1a1aa] font-sans text-xs">
                        {container.status}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right font-sans">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Log Button */}
                          <button
                            onClick={() => onOpenLogs(container)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#18181b] hover:bg-[#27272a] text-[#a1a1aa] hover:text-white border border-[#27272a] text-xs transition-colors"
                            title="查看实时日志"
                          >
                            <FileText className="w-3 h-3 text-blue-400" />
                            <span>日志</span>
                          </button>

                          {/* Restart Button */}
                          {isRunning ? (
                            <button
                              disabled={isLoading}
                              onClick={() => onAction(container.id, 'restart')}
                              className="p-1 rounded bg-[#18181b] hover:bg-[#27272a] text-[#a1a1aa] hover:text-amber-400 border border-[#27272a] transition-colors disabled:opacity-50"
                              title="重启容器"
                            >
                              <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                            </button>
                          ) : null}

                          {/* Stop / Start Button */}
                          {isRunning ? (
                            <button
                              disabled={isLoading}
                              onClick={() => onAction(container.id, 'stop')}
                              className="p-1 rounded bg-[#18181b] hover:bg-red-500/10 text-[#a1a1aa] hover:text-red-400 border border-[#27272a] hover:border-red-500/30 transition-colors disabled:opacity-50"
                              title="停止容器"
                            >
                              <Square className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              disabled={isLoading}
                              onClick={() => onAction(container.id, 'start')}
                              className="p-1 rounded bg-[#18181b] hover:bg-emerald-500/10 text-[#a1a1aa] hover:text-emerald-400 border border-[#27272a] hover:border-emerald-500/30 transition-colors disabled:opacity-50"
                              title="启动容器"
                            >
                              <Play className="w-3.5 h-3.5" />
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
  );
};
