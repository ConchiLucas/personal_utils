import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Database
} from 'lucide-react';
import { Workspace } from '../../types';

interface WorkspaceSidebarProps {
  workspaces: Workspace[];
  selectedWorkspace: string;
  onSelectWorkspace: (slug: string) => void;
  onAddWorkspace: (name: string, slug: string, desc: string) => void;
  onDeleteWorkspace: (id: number) => void;
  containerCounts: Record<string, number>;
}

export const WorkspaceSidebar: React.FC<WorkspaceSidebarProps> = ({
  workspaces,
  selectedWorkspace,
  onSelectWorkspace,
  onAddWorkspace,
  onDeleteWorkspace,
  containerCounts,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [desc, setDesc] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !slug) return;
    onAddWorkspace(name, slug, desc);
    setName('');
    setSlug('');
    setDesc('');
    setIsModalOpen(false);
  };

  return (
    <aside className="w-64 sm:w-72 bg-[#09090b] border-r border-[#27272a] flex flex-col shrink-0 h-[calc(100vh-3.5rem)] select-none">
      {/* Workspace List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {workspaces.map((ws) => {
          const isSelected = selectedWorkspace === ws.slug;
          const count = ws.container_count ?? (containerCounts[ws.slug] ?? 0);

          return (
            <div
              key={ws.id}
              onClick={() => onSelectWorkspace(ws.slug)}
              className={`group flex items-start justify-between p-2.5 rounded-lg cursor-pointer transition-all border ${
                isSelected
                  ? 'bg-[#18181b] border-blue-500/30 text-white shadow-sm'
                  : 'border-transparent text-[#a1a1aa] hover:bg-[#18181b]/50 hover:text-[#f4f4f5]'
              }`}
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <div
                  className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                    ws.color === 'purple'
                      ? 'bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]'
                      : ws.color === 'sky'
                      ? 'bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.5)]'
                      : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                  }`}
                />
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-medium truncate flex items-center gap-1.5">
                    {ws.name}
                    {ws.is_default && (
                      <CheckCircle2 className="w-3 h-3 text-emerald-400 inline shrink-0" />
                    )}
                  </span>
                  {ws.description && (
                    <span className="text-[11px] text-[#71717a] truncate mt-0.5">
                      {ws.description}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#27272a] text-[#a1a1aa]">
                  {count}
                </span>

                {!ws.is_default && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`确定删除工作空间 "${ws.name}" 吗？`)) {
                        onDeleteWorkspace(ws.id);
                      }
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-opacity"
                    title="删除"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-[#27272a] text-[11px] text-[#71717a] bg-[#09090b]">
        <div className="flex items-center justify-between mb-1">
          <span className="flex items-center gap-1.5">
            <Database className="w-3 h-3 text-blue-400" /> PostgreSQL
          </span>
          <span className="text-emerald-400 font-mono">Connected :5432</span>
        </div>
        <div className="text-[10px] text-[#52525b]">
          Docker Daemon: unix:///var/run/docker.sock
        </div>
      </div>

      {/* Add Workspace Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-5 w-full max-w-sm shadow-2xl">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Plus className="w-4 h-4 text-blue-400" /> 新建工作空间
            </h3>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="text-[11px] text-[#a1a1aa] block mb-1">空间名称</label>
                <input
                  type="text"
                  required
                  placeholder="例如: 模型微调环境"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#09090b] border border-[#27272a] rounded-md px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-[11px] text-[#a1a1aa] block mb-1">唯一标识 (Slug)</label>
                <input
                  type="text"
                  required
                  placeholder="例如: ai-finetune"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full bg-[#09090b] border border-[#27272a] rounded-md px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] text-[#a1a1aa] block mb-1">空间描述 (可选)</label>
                <input
                  type="text"
                  placeholder="例如: 用于训练与批量测试的容器组"
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  className="w-full bg-[#09090b] border border-[#27272a] rounded-md px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 rounded-md text-xs text-[#a1a1aa] hover:bg-[#27272a]"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-md text-xs bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-sm"
                >
                  创建空间
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </aside>
  );
};
