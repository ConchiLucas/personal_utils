import React from 'react';
import { Home, Boxes, Layers, Cpu, BookOpen, Send, Terminal, Folder } from 'lucide-react';
import { MainNavTab } from '../../types';

interface TopNavProps {
  activeTab: MainNavTab;
  onSelectTab: (tab: MainNavTab) => void;
}

export const TopNav: React.FC<TopNavProps> = ({ activeTab, onSelectTab }) => {
  return (
    <header className="w-full bg-[#09090b] border-b border-[#27272a] sticky top-0 z-30 select-none">
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* Left: Brand & Top Menu Tabs */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold shadow-sm shadow-blue-500/10">
              ⚡
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-sm tracking-tight text-white flex items-center gap-1.5">
                Personal Utils
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 font-mono border border-blue-500/20">
                  v1.0
                </span>
              </span>
            </div>
          </div>

          <div className="h-4 w-px bg-[#27272a]" />

          {/* Top Menu Tabs */}
          <nav className="flex items-center gap-1.5">
            {/* 1. 首页 */}
            <button
              onClick={() => onSelectTab('home')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === 'home'
                  ? 'bg-[#27272a] text-white shadow-sm font-semibold'
                  : 'text-[#a1a1aa] hover:text-white hover:bg-[#18181b]'
              }`}
            >
              <Home className={`w-3.5 h-3.5 ${activeTab === 'home' ? 'text-amber-400' : 'text-[#71717a]'}`} />
              <span>首页</span>
              <span className="text-[9px] px-1 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Hub
              </span>
            </button>

            {/* 2. 容器概览 */}
            <button
              onClick={() => onSelectTab('containers')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === 'containers'
                  ? 'bg-[#27272a] text-white shadow-sm font-semibold'
                  : 'text-[#a1a1aa] hover:text-white hover:bg-[#18181b]'
              }`}
            >
              <Boxes className={`w-3.5 h-3.5 ${activeTab === 'containers' ? 'text-blue-400' : 'text-[#71717a]'}`} />
              <span>容器概览</span>
              <span className="text-[9px] px-1 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Docker
              </span>
            </button>

            {/* 3. 服务概览 */}
            <button
              onClick={() => onSelectTab('projects')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === 'projects'
                  ? 'bg-[#27272a] text-white shadow-sm font-semibold'
                  : 'text-[#a1a1aa] hover:text-white hover:bg-[#18181b]'
              }`}
            >
              <Layers className={`w-3.5 h-3.5 ${activeTab === 'projects' ? 'text-sky-400' : 'text-[#71717a]'}`} />
              <span>服务概览</span>
              <span className="text-[9px] px-1 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                Projects
              </span>
            </button>

            {/* 4. 脚本与中间件 */}
            <button
              onClick={() => onSelectTab('services')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === 'services'
                  ? 'bg-[#27272a] text-white shadow-sm font-semibold'
                  : 'text-[#a1a1aa] hover:text-white hover:bg-[#18181b]'
              }`}
            >
              <Cpu className={`w-3.5 h-3.5 ${activeTab === 'services' ? 'text-sky-400' : 'text-[#71717a]'}`} />
              <span>脚本与中间件</span>
              <span className="text-[9px] px-1 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                Middleware
              </span>
            </button>

            {/* 5. 常用笔记 */}
            <button
              onClick={() => onSelectTab('notes')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === 'notes'
                  ? 'bg-[#27272a] text-white shadow-sm font-semibold'
                  : 'text-[#a1a1aa] hover:text-white hover:bg-[#18181b]'
              }`}
            >
              <BookOpen className={`w-3.5 h-3.5 ${activeTab === 'notes' ? 'text-blue-400' : 'text-[#71717a]'}`} />
              <span>常用笔记</span>
              <span className="text-[9px] px-1 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                AI Notes
              </span>
            </button>

            {/* 6. 文件管理 */}
            <button
              onClick={() => onSelectTab('files')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === 'files'
                  ? 'bg-[#27272a] text-white shadow-sm font-semibold'
                  : 'text-[#a1a1aa] hover:text-white hover:bg-[#18181b]'
              }`}
            >
              <Folder className={`w-3.5 h-3.5 ${activeTab === 'files' ? 'text-purple-400' : 'text-[#71717a]'}`} />
              <span>文件管理</span>
              <span className="text-[9px] px-1 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                MinIO
              </span>
            </button>

            {/* 7. 脚本库 */}
            <button
              onClick={() => onSelectTab('scripts')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === 'scripts'
                  ? 'bg-[#27272a] text-white shadow-sm font-semibold'
                  : 'text-[#a1a1aa] hover:text-white hover:bg-[#18181b]'
              }`}
            >
              <Terminal className={`w-3.5 h-3.5 ${activeTab === 'scripts' ? 'text-emerald-400' : 'text-[#71717a]'}`} />
              <span>脚本库</span>
              <span className="text-[9px] px-1 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Script Hub
              </span>
            </button>

            {/* 8. 敏捷请求 */}
            <button
              onClick={() => onSelectTab('agile_request')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === 'agile_request'
                  ? 'bg-[#27272a] text-white shadow-sm font-semibold'
                  : 'text-[#a1a1aa] hover:text-white hover:bg-[#18181b]'
              }`}
            >
              <Send className={`w-3.5 h-3.5 ${activeTab === 'agile_request' ? 'text-blue-400' : 'text-[#71717a]'}`} />
              <span>敏捷请求</span>
              <span className="text-[9px] px-1 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                API Client
              </span>
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
};
