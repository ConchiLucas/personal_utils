import React from 'react';
import { 
  Terminal, 
  Database, 
  Layers, 
  Network, 
  Cpu, 
  Box 
} from 'lucide-react';
import { ScriptCategory } from '../../types';

interface ScriptSidebarProps {
  categories: ScriptCategory[];
  selectedCategory: string;
  onSelectCategory: (slug: string) => void;
  totalScriptCount: number;
}

const colorMap: Record<string, { bg: string; text: string; border: string }> = {
  blue: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
  emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  amber: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  purple: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
  rose: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20' },
  sky: { bg: 'bg-sky-500/10', text: 'text-sky-400', border: 'border-sky-500/20' },
};

export const ScriptSidebar: React.FC<ScriptSidebarProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
  totalScriptCount,
}) => {
  const getCategoryIcon = (iconName: string, color: string = 'blue') => {
    const c = colorMap[color]?.text || 'text-zinc-400';
    switch (iconName) {
      case 'container':
      case 'docker':
        return <Box className={`w-3.5 h-3.5 ${c}`} />;
      case 'database':
      case 'db':
        return <Database className={`w-3.5 h-3.5 ${c}`} />;
      case 'network':
        return <Network className={`w-3.5 h-3.5 ${c}`} />;
      case 'cpu':
        return <Cpu className={`w-3.5 h-3.5 ${c}`} />;
      default:
        return <Terminal className={`w-3.5 h-3.5 ${c}`} />;
    }
  };

  return (
    <aside className="w-64 border-r border-[#27272a] bg-[#09090b] flex flex-col shrink-0 h-[calc(100vh-3.5rem)] select-none">
      {/* Header */}
      <div className="p-3.5 border-b border-[#27272a] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">脚本分类</span>
        </div>
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#18181b] border border-[#27272a] text-[#71717a] font-mono">
          {totalScriptCount} 脚本
        </span>
      </div>

      {/* Category List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {/* All Scripts Tab */}
        <button
          onClick={() => onSelectCategory('all')}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all group ${
            selectedCategory === 'all'
              ? 'bg-[#18181b] text-white border border-emerald-500/40 shadow-sm font-semibold'
              : 'text-[#a1a1aa] hover:text-white hover:bg-[#18181b]/50 border border-transparent'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Layers className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate">🌟 全部脚本 (All)</span>
          </div>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#27272a] text-[#a1a1aa] font-mono shrink-0">
            {totalScriptCount}
          </span>
        </button>

        {/* Categories */}
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat.slug;
          return (
            <div
              key={cat.id}
              onClick={() => onSelectCategory(cat.slug)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium cursor-pointer transition-all group ${
                isSelected
                  ? 'bg-[#18181b] text-white border border-blue-500/40 shadow-sm font-semibold'
                  : 'text-[#a1a1aa] hover:text-white hover:bg-[#18181b]/50 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {getCategoryIcon(cat.icon, cat.color)}
                <span className="truncate">{cat.name}</span>
              </div>

              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#27272a] text-[#a1a1aa] font-mono">
                {cat.script_count ?? 0}
              </span>
            </div>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-[#27272a] text-[11px] text-[#71717a] flex items-center justify-between bg-[#09090b]">
        <span>双模式执行引擎</span>
        <span className="font-mono text-[10px] text-emerald-400">Direct / Dynamic</span>
      </div>
    </aside>
  );
};
