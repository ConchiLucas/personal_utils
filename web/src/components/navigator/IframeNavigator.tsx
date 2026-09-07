import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Globe,
  ExternalLink,
  RotateCw,
  Copy,
  Check,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
  Monitor,
  Tablet,
  Smartphone,
  Maximize2,
  Minimize2,
  AlertCircle,
  RefreshCw,
  Layers,
  SlidersHorizontal,
  X,
  CheckSquare,
  Square,
} from 'lucide-react';
import { api } from '../../api/client';
import { DashboardItem, Workspace } from '../../types';

// 工作空间展示元数据映射
const WORKSPACE_PRESETS: Record<string, { label: string; short: string; icon: string; tagClass: string; desc: string }> = {
  'all': {
    label: '全部工作空间',
    short: '全部',
    icon: '🌟',
    tagClass: 'bg-zinc-800 text-zinc-300 border-zinc-700',
    desc: '展示系统全部常用网站与工程前端',
  },
  'kid-workbench': {
    label: '🎒 儿童学习工作台',
    short: '儿童工作台',
    icon: '🎒',
    tagClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    desc: '包含儿童学科答题端 (拼音/科普/英语/算数/识字/古诗/短句/成语/逻辑)、题目后台及家长看板',
  },
  'python_workforce': {
    label: '🤖 python_workforce',
    short: 'Python',
    icon: '🤖',
    tagClass: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    desc: 'Agent Context Router 路由大盘、英语素材管理平台与统一收件箱监控',
  },
  'rob_english_word': {
    label: '🔤 rob_english_word',
    short: '单词学习',
    icon: '🔤',
    tagClass: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
    desc: '英语单词背诵、完形填空平台与 english-word 运营后台',
  },
  'stock_workforce': {
    label: '📈 stock_workforce',
    short: '股票量化',
    icon: '📈',
    tagClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    desc: '股票量化交易前端与量化调度大盘',
  },
  'shared-config-center': {
    label: '⚙️ shared-config-center',
    short: '配置中心',
    icon: '⚙️',
    tagClass: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    desc: '统一微服务与应用共享配置中心管理平台',
  },
};

const PREFERENCE_KEY = 'iframe_nav_categories';

export const IframeNavigator: React.FC = () => {
  const [items, setItems] = useState<DashboardItem[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // 选中的分类 slug 列表（支持多选或单选，['all'] 表示全选）
  const [selectedCategories, setSelectedCategories] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(PREFERENCE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return ['all'];
  });

  // 分类弹窗开关与弹窗内临时状态
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState<boolean>(false);
  const [tempSelectedCategories, setTempSelectedCategories] = useState<string[]>(['all']);
  const [isSavingPreference, setIsSavingPreference] = useState<boolean>(false);

  const [selectedId, setSelectedId] = useState<number | null>(() => {
    const saved = localStorage.getItem('iframe_nav_selected_id');
    return saved ? Number(saved) : null;
  });
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterOnlineOnly, setFilterOnlineOnly] = useState<boolean>(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('iframe_nav_sidebar_collapsed') === 'true';
  });
  const [viewportMode, setViewportMode] = useState<'full' | 'ipad' | 'mobile'>('full');
  const [iframeLoading, setIframeLoading] = useState<boolean>(true);
  const [iframeKey, setIframeKey] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2200);
  };

  // 初始化加载数据并从数据库读取分类偏好
  const loadData = async () => {
    try {
      setLoading(true);
      const [dashRes, wsRes, dbPref] = await Promise.all([
        api.getDashboardItems(),
        api.getWorkspaces().catch(() => []),
        api.getPreference(PREFERENCE_KEY).catch(() => ''),
      ]);

      const websites = dashRes.website || [];
      setItems(websites);
      setWorkspaces(wsRes);

      // 若数据库中有持久化的分类偏好，则优先以此为准
      let activeCategories = selectedCategories;
      if (dbPref) {
        try {
          const parsed = JSON.parse(dbPref);
          if (Array.isArray(parsed) && parsed.length > 0) {
            activeCategories = parsed;
            setSelectedCategories(parsed);
            localStorage.setItem(PREFERENCE_KEY, JSON.stringify(parsed));
          }
        } catch (e) {
          console.error('Failed to parse preference from DB:', e);
        }
      }

      // 计算当前在选定分类下的项目集合
      const validItems =
        activeCategories.includes('all')
          ? websites
          : websites.filter((item) => activeCategories.includes(item.workspace_slug || ''));

      // 验证当前选中的 ID 是否在新分类下有效
      setSelectedId((prevId) => {
        if (prevId && validItems.some((w) => w.id === prevId)) {
          return prevId;
        }
        const firstOnline = validItems.find((w) => w.is_online);
        return firstOnline ? firstOnline.id : validItems[0]?.id ?? null;
      });
    } catch (err: any) {
      console.error('Failed to load dashboard items or workspaces:', err);
      showToast(`加载失败: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 持久化当前选中的项目 ID 到本地
  useEffect(() => {
    if (selectedId) {
      localStorage.setItem('iframe_nav_selected_id', String(selectedId));
    }
  }, [selectedId]);

  // 持久化侧边栏折叠状态
  useEffect(() => {
    localStorage.setItem('iframe_nav_sidebar_collapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  // 全屏变化事件监听
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // 计算可供筛选的分类详细信息
  const categoryDetails = useMemo(() => {
    const countMap: Record<string, { total: number; online: number; items: DashboardItem[] }> = {};
    items.forEach((item) => {
      const slug = item.workspace_slug || 'other';
      if (!countMap[slug]) {
        countMap[slug] = { total: 0, online: 0, items: [] };
      }
      countMap[slug].total += 1;
      if (item.is_online) countMap[slug].online += 1;
      countMap[slug].items.push(item);
    });

    const list: {
      slug: string;
      name: string;
      short: string;
      icon: string;
      total: number;
      online: number;
      desc: string;
      tagClass: string;
      sampleTitles: string[];
    }[] = [];

    const presetSlugs = ['kid-workbench', 'python_workforce', 'rob_english_word', 'stock_workforce', 'shared-config-center'];
    presetSlugs.forEach((slug) => {
      if (countMap[slug]) {
        const wsFromDb = workspaces.find((w) => w.slug === slug);
        const preset = WORKSPACE_PRESETS[slug];
        list.push({
          slug,
          name: wsFromDb?.name || preset?.label || slug,
          short: preset?.short || wsFromDb?.name || slug,
          icon: preset?.icon || '📁',
          total: countMap[slug].total,
          online: countMap[slug].online,
          desc: wsFromDb?.description || preset?.desc || '工作空间分类项目',
          tagClass: preset?.tagClass || 'bg-zinc-800 text-zinc-300 border-zinc-700',
          sampleTitles: countMap[slug].items.map((i) => i.title),
        });
      }
    });

    Object.keys(countMap).forEach((slug) => {
      if (!presetSlugs.includes(slug) && slug !== 'all') {
        const wsFromDb = workspaces.find((w) => w.slug === slug);
        list.push({
          slug,
          name: wsFromDb?.name || slug,
          short: wsFromDb?.name || slug,
          icon: '📁',
          total: countMap[slug].total,
          online: countMap[slug].online,
          desc: wsFromDb?.description || '其它项目',
          tagClass: 'bg-zinc-800 text-zinc-300 border-zinc-700',
          sampleTitles: countMap[slug].items.map((i) => i.title),
        });
      }
    });

    return list;
  }, [items, workspaces]);

  // 根据当前已持久化的分类过滤项目
  const categorizedItems = useMemo(() => {
    if (selectedCategories.includes('all')) {
      return items;
    }
    return items.filter((item) => selectedCategories.includes(item.workspace_slug || ''));
  }, [items, selectedCategories]);

  // 搜索和在线过滤后的最终列表
  const filteredItems = useMemo(() => {
    return categorizedItems.filter((item) => {
      const matchSearch =
        !searchQuery.trim() ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.content.toLowerCase().includes(searchQuery.toLowerCase());
      const matchOnline = !filterOnlineOnly || item.is_online;
      return matchSearch && matchOnline;
    });
  }, [categorizedItems, searchQuery, filterOnlineOnly]);

  const onlineCount = useMemo(() => {
    return categorizedItems.filter((item) => item.is_online).length;
  }, [categorizedItems]);

  const activeItem = useMemo(() => {
    return items.find((item) => item.id === selectedId) || null;
  }, [items, selectedId]);

  // 按钮上显示的分类摘要文本
  const categorySummary = useMemo(() => {
    if (selectedCategories.includes('all')) {
      return {
        title: '全部工作空间',
        badge: `${items.length} 个项目`,
        icon: '🌟',
      };
    }
    if (selectedCategories.length === 1) {
      const slug = selectedCategories[0];
      const found = categoryDetails.find((c) => c.slug === slug);
      return {
        title: found?.name || slug,
        badge: `${found?.total || 0} 个项目`,
        icon: found?.icon || '📁',
      };
    }
    return {
      title: `已选 ${selectedCategories.length} 个分类`,
      badge: `${categorizedItems.length} 个项目`,
      icon: '🗂️',
    };
  }, [selectedCategories, items, categoryDetails, categorizedItems]);

  // 打开弹窗准备
  const handleOpenCategoryModal = () => {
    setTempSelectedCategories([...selectedCategories]);
    setIsCategoryModalOpen(true);
  };

  // 切换分类勾选（在弹窗内）
  const handleToggleCategory = (slug: string) => {
    if (slug === 'all') {
      setTempSelectedCategories(['all']);
      return;
    }
    let next = tempSelectedCategories.filter((s) => s !== 'all');
    if (next.includes(slug)) {
      next = next.filter((s) => s !== slug);
      if (next.length === 0) {
        next = ['all'];
      }
    } else {
      next.push(slug);
    }
    setTempSelectedCategories(next);
  };

  // 单选并直接保存某一个分类
  const handleSelectOnlyCategory = async (slug: string) => {
    await handleApplyCategories([slug]);
    setIsCategoryModalOpen(false);
  };

  // 持久化应用并保存分类到数据库及本地
  const handleApplyCategories = async (categoriesToSave: string[]) => {
    try {
      setIsSavingPreference(true);
      const jsonStr = JSON.stringify(categoriesToSave);

      // 1. 本地即时保存
      setSelectedCategories(categoriesToSave);
      localStorage.setItem(PREFERENCE_KEY, jsonStr);

      // 2. 数据库持久化保存
      await api.setPreference(PREFERENCE_KEY, jsonStr);

      // 3. 检查当前右侧正在预览的项目是否仍包含在所选分类中
      const newItems =
        categoriesToSave.includes('all')
          ? items
          : items.filter((item) => categoriesToSave.includes(item.workspace_slug || ''));

      if (newItems.length > 0) {
        const stillExists = newItems.some((item) => item.id === selectedId);
        if (!stillExists) {
          const firstOnline = newItems.find((w) => w.is_online);
          const nextSelected = firstOnline ? firstOnline.id : newItems[0].id;
          setSelectedId(nextSelected);
          setIframeLoading(true);
          setIframeKey((prev) => prev + 1);
        }
      }

      showToast('分类已持久化保存至数据库，下次打开保持生效');
    } catch (err: any) {
      console.error('Failed to persist category preference:', err);
      showToast(`保存分类失败: ${err.message}`);
    } finally {
      setIsSavingPreference(false);
    }
  };

  // 切换选中站点
  const handleSelectItem = (item: DashboardItem) => {
    if (item.id === selectedId) return;
    setSelectedId(item.id);
    setIframeLoading(true);
    setIframeKey((prev) => prev + 1);
  };

  // 刷新当前 iframe
  const handleRefreshIframe = () => {
    setIframeLoading(true);
    setIframeKey((prev) => prev + 1);
  };

  // 复制当前 URL
  const handleCopyUrl = async () => {
    if (!activeItem?.content) return;
    try {
      await navigator.clipboard.writeText(activeItem.content);
      setCopied(true);
      showToast('链接已复制到剪贴板');
      setTimeout(() => setCopied(false), 1500);
    } catch {
      showToast('复制失败，请手动复制');
    }
  };

  // 切换全屏
  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      try {
        await containerRef.current.requestFullscreen();
      } catch (err) {
        console.error('Failed to enter fullscreen:', err);
      }
    } else {
      try {
        await document.exitFullscreen();
      } catch (err) {
        console.error('Failed to exit fullscreen:', err);
      }
    }
  };

  // 提取端口或简短描述
  const formatUrlBadge = (url: string) => {
    try {
      const parsed = new URL(url);
      return parsed.port ? `:${parsed.port}${parsed.pathname !== '/' ? parsed.pathname : ''}` : parsed.hostname;
    } catch {
      return url.replace(/^https?:\/\//, '');
    }
  };

  return (
    <div ref={containerRef} className="flex h-full w-full bg-[#09090b] text-zinc-100 overflow-hidden relative">
      {/* Toast 提示 */}
      {toastMessage && (
        <div className="fixed top-16 right-6 z-50 px-3.5 py-2 rounded-lg bg-zinc-800/95 border border-zinc-700 text-xs text-white shadow-xl shadow-black/50 animate-in fade-in slide-in-from-top-2 duration-200">
          {toastMessage}
        </div>
      )}

      {/* 左侧：常用项目导航侧边栏 */}
      <aside
        className={`flex flex-col border-r border-[#27272a] bg-[#0d0d10] transition-all duration-300 ease-in-out shrink-0 ${
          sidebarCollapsed ? 'w-14' : 'w-72 sm:w-84'
        }`}
      >
        {/* 侧边栏头部 */}
        <div className="p-3 border-b border-[#27272a] flex items-center justify-between gap-2 shrink-0">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-md bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                <Globe className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-xs font-bold text-white tracking-wide truncate">项目导航台</h2>
                <div className="flex items-center gap-1.5 text-[10px] text-zinc-400">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
                  <span>
                    {onlineCount}/{categorizedItems.length} 在线
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-1 ml-auto">
            {!sidebarCollapsed && (
              <button
                onClick={loadData}
                title="重新探测并刷新服务列表"
                className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-400' : ''}`} />
              </button>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              title={sidebarCollapsed ? '展开导航侧栏' : '折叠侧栏以最大化视图'}
              className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md transition-colors"
            >
              {sidebarCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* 折叠模式下的简单展示 */}
        {sidebarCollapsed ? (
          <div className="flex-1 overflow-y-auto py-2 px-1 flex flex-col gap-2 items-center">
            {/* 折叠模式下的分类按钮 */}
            <button
              onClick={handleOpenCategoryModal}
              title={`当前分类: ${categorySummary.title} (点击打开分类筛选详情)`}
              className="w-10 h-10 rounded-lg bg-blue-600/15 border border-blue-500/40 text-blue-400 flex items-center justify-center hover:bg-blue-600/25 transition-all"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>

            <div className="w-8 h-px bg-zinc-800 my-1" />

            {filteredItems.map((item) => {
              const isSelected = item.id === selectedId;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectItem(item)}
                  title={`${item.title} (${item.content}) [${item.is_online ? '在线' : '未启动'}]`}
                  className={`relative w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                    isSelected
                      ? 'bg-blue-600/20 border border-blue-500/50 text-blue-400 shadow-sm shadow-blue-500/10'
                      : 'hover:bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 border border-transparent'
                  }`}
                >
                  <span className="text-xs font-bold">{item.title.slice(0, 1)}</span>
                  <span
                    className={`absolute bottom-1 right-1 w-2 h-2 rounded-full border-2 border-[#0d0d10] ${
                      item.is_online ? 'bg-emerald-500' : 'bg-zinc-600'
                    }`}
                  />
                </button>
              );
            })}
          </div>
        ) : (
          <>
            {/* 核心功能：分类筛选与详情弹出按钮 */}
            <div className="p-2.5 border-b border-[#27272a] bg-[#121216]/80 flex flex-col gap-2 shrink-0">
              <button
                onClick={handleOpenCategoryModal}
                className="group w-full p-2.5 bg-[#18181c] hover:bg-[#1e1e24] border border-[#27272a] hover:border-blue-500/50 rounded-xl transition-all flex items-center justify-between text-left shadow-sm"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-sm shrink-0 group-hover:scale-105 transition-transform">
                    {categorySummary.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-zinc-100 truncate group-hover:text-blue-300 transition-colors">
                        {categorySummary.title}
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-400 mt-0.5 truncate">
                      {categorySummary.badge} · <span className="text-blue-400">点击切换/持久化分类</span>
                    </div>
                  </div>
                </div>

                <div className="p-1.5 rounded-lg bg-zinc-800/60 border border-zinc-700/60 text-zinc-400 group-hover:text-white group-hover:bg-blue-600/20 group-hover:border-blue-500/40 transition-all shrink-0 ml-2">
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                </div>
              </button>
            </div>

            {/* 搜索与在线过滤 */}
            <div className="p-2.5 border-b border-[#27272a] flex flex-col gap-2 shrink-0 bg-[#09090b]/50">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="在已选分类中搜索项目或端口..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-[#121215] border border-[#27272a] focus:border-blue-500 rounded-lg text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none transition-colors"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-zinc-400 hover:text-white px-1"
                  >
                    ×
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between text-[11px] px-0.5">
                <button
                  onClick={() => setFilterOnlineOnly(false)}
                  className={`px-2 py-0.5 rounded transition-all font-medium ${
                    !filterOnlineOnly
                      ? 'bg-zinc-800 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                  }`}
                >
                  全部 ({categorizedItems.length})
                </button>
                <button
                  onClick={() => setFilterOnlineOnly(true)}
                  className={`px-2 py-0.5 rounded transition-all font-medium flex items-center gap-1.5 ${
                    filterOnlineOnly
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  仅看在线 ({onlineCount})
                </button>
              </div>
            </div>

            {/* 项目列表滚动区 */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {loading && items.length === 0 ? (
                <div className="py-12 text-center text-zinc-500 text-xs flex flex-col items-center gap-2">
                  <RotateCw className="w-4 h-4 animate-spin text-blue-400" />
                  <span>加载常用网站列表中...</span>
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="py-10 text-center text-zinc-500 text-xs flex flex-col items-center gap-2">
                  <span>当前所选分类内未找到匹配项目</span>
                  <button
                    onClick={handleOpenCategoryModal}
                    className="px-2.5 py-1 rounded-md bg-blue-600/20 text-blue-400 border border-blue-500/30 text-xs hover:bg-blue-600/30 transition-colors"
                  >
                    切换工作空间分类
                  </button>
                </div>
              ) : (
                filteredItems.map((item) => {
                  const isSelected = item.id === selectedId;
                  const portBadge = formatUrlBadge(item.content);
                  const wsPreset = item.workspace_slug ? WORKSPACE_PRESETS[item.workspace_slug] : null;

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleSelectItem(item)}
                      className={`group relative rounded-xl p-2.5 transition-all cursor-pointer border select-none ${
                        isSelected
                          ? 'bg-blue-600/15 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.12)]'
                          : 'bg-[#121215]/80 hover:bg-[#18181c] border-[#222227] hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5 min-w-0 flex-1">
                          {/* 状态指示点 */}
                          <div className="mt-1 shrink-0 relative flex items-center justify-center">
                            {item.is_online ? (
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
                              </span>
                            ) : (
                              <span className="inline-flex rounded-full h-1.5 w-1.5 bg-zinc-600" />
                            )}
                          </div>

                          {/* 标题与地址 */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`text-xs font-semibold truncate ${
                                  isSelected ? 'text-blue-300' : 'text-zinc-200 group-hover:text-white'
                                }`}
                                title={item.title}
                              >
                                {item.title}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              <span className="text-[10px] font-mono text-zinc-500 bg-zinc-900/90 px-1 py-0.2 rounded border border-zinc-800 truncate">
                                {portBadge}
                              </span>

                              {/* 全局视图或多选视图下展示所属分类标签 */}
                              {(selectedCategories.includes('all') || selectedCategories.length > 1) && wsPreset && (
                                <span
                                  className={`text-[9px] px-1 py-0.2 rounded border font-medium truncate ${wsPreset.tagClass}`}
                                >
                                  {wsPreset.short}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* 直接新标签打开按钮 */}
                        <a
                          href={item.content}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          title="在新标签页中打开"
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded shrink-0"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </aside>

      {/* 右侧：现代化 iFrame 预览容器 */}
      <section className="flex-1 flex flex-col h-full bg-[#09090b] min-w-0 overflow-hidden">
        {activeItem ? (
          <>
            {/* 顶部控制栏 (Browser Address Bar) */}
            <div className="h-12 border-b border-[#27272a] bg-[#0d0d10] px-3.5 flex items-center justify-between gap-3 shrink-0">
              {/* 左侧：当前站点信息与地址徽章 */}
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="flex items-center gap-2 min-w-0">
                  {/* 在线指示 */}
                  <div className="relative flex items-center justify-center shrink-0">
                    {activeItem.is_online ? (
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full h-2 w-2 bg-zinc-600" />
                    )}
                  </div>
                  <h3 className="text-xs font-bold text-white truncate max-w-[200px] sm:max-w-xs" title={activeItem.title}>
                    {activeItem.title}
                  </h3>

                  {/* 对应所属工作空间标 */}
                  {activeItem.workspace_slug && WORKSPACE_PRESETS[activeItem.workspace_slug] && (
                    <span
                      className={`hidden lg:inline-flex text-[10px] px-1.5 py-0.5 rounded border font-medium ${
                        WORKSPACE_PRESETS[activeItem.workspace_slug].tagClass
                      }`}
                    >
                      {WORKSPACE_PRESETS[activeItem.workspace_slug].short}
                    </span>
                  )}
                </div>

                {/* 仿浏览器地址栏 */}
                <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#16161a] border border-[#27272a] text-xs font-mono text-zinc-300 max-w-md truncate">
                  <span className="text-zinc-500 text-[11px]">URL</span>
                  <span className="truncate text-zinc-300">{activeItem.content}</span>
                </div>
              </div>

              {/* 右侧：视口切换与控制按钮 */}
              <div className="flex items-center gap-1.5 shrink-0">
                {/* 视口尺寸切换器 */}
                <div className="hidden sm:flex items-center bg-[#16161a] border border-[#27272a] rounded-lg p-0.5 text-xs text-zinc-400">
                  <button
                    onClick={() => setViewportMode('full')}
                    title="自适应全宽"
                    className={`flex items-center gap-1 px-2 py-1 rounded-md transition-all ${
                      viewportMode === 'full' ? 'bg-zinc-800 text-white font-medium shadow-sm' : 'hover:text-zinc-200'
                    }`}
                  >
                    <Monitor className="w-3 h-3" />
                    <span className="text-[11px]">全宽</span>
                  </button>
                  <button
                    onClick={() => setViewportMode('ipad')}
                    title="iPad 横屏视口 (1024px) - 适配儿童工作台等横屏应用"
                    className={`flex items-center gap-1 px-2 py-1 rounded-md transition-all ${
                      viewportMode === 'ipad' ? 'bg-zinc-800 text-white font-medium shadow-sm' : 'hover:text-zinc-200'
                    }`}
                  >
                    <Tablet className="w-3 h-3" />
                    <span className="text-[11px]">iPad</span>
                  </button>
                  <button
                    onClick={() => setViewportMode('mobile')}
                    title="手机端视口 (430px)"
                    className={`flex items-center gap-1 px-2 py-1 rounded-md transition-all ${
                      viewportMode === 'mobile' ? 'bg-zinc-800 text-white font-medium shadow-sm' : 'hover:text-zinc-200'
                    }`}
                  >
                    <Smartphone className="w-3 h-3" />
                    <span className="text-[11px]">移动</span>
                  </button>
                </div>

                <div className="h-4 w-px bg-zinc-800 mx-0.5 hidden sm:block" />

                {/* 刷新 iframe */}
                <button
                  onClick={handleRefreshIframe}
                  title="刷新当前页面"
                  className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md transition-colors"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${iframeLoading ? 'animate-spin text-blue-400' : ''}`} />
                </button>

                {/* 复制链接 */}
                <button
                  onClick={handleCopyUrl}
                  title="复制链接"
                  className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>

                {/* 在新标签页打开 */}
                <a
                  href={activeItem.content}
                  target="_blank"
                  rel="noreferrer"
                  title="在新标签页中打开"
                  className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                {/* 全屏显示切换 */}
                <button
                  onClick={toggleFullscreen}
                  title={isFullscreen ? '退出全屏' : '全屏浏览'}
                  className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md transition-colors"
                >
                  {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* 未启动服务告警提示 */}
            {!activeItem.is_online && (
              <div className="bg-amber-500/10 border-b border-amber-500/20 px-3.5 py-1.5 flex items-center justify-between text-xs text-amber-300">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>
                    提示：该服务当前探测未监听端口（可能尚未启动）。若页面无法加载，请先在终端启动该服务。
                  </span>
                </div>
                <a
                  href={activeItem.content}
                  target="_blank"
                  rel="noreferrer"
                  className="underline hover:text-amber-100 font-medium shrink-0 ml-2"
                >
                  尝试新窗口打开
                </a>
              </div>
            )}

            {/* 主预览视口容器 */}
            <div className="flex-1 w-full h-full bg-[#050507] overflow-hidden flex items-center justify-center p-0 relative">
              {/* iFrame 加载动画遮罩 */}
              {iframeLoading && (
                <div className="absolute inset-0 bg-[#09090b]/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-10 pointer-events-none transition-opacity">
                  <RotateCw className="w-6 h-6 animate-spin text-blue-500" />
                  <span className="text-xs text-zinc-400 font-mono">正在加载 {activeItem.title}...</span>
                </div>
              )}

              {/* 核心视口包裹层 */}
              <div
                className={`h-full transition-all duration-300 flex flex-col overflow-hidden ${
                  viewportMode === 'ipad'
                    ? 'w-[1024px] max-w-full my-auto border-x border-zinc-800 shadow-[0_0_40px_rgba(0,0,0,0.8)]'
                    : viewportMode === 'mobile'
                    ? 'w-[430px] max-w-full my-auto border-x border-zinc-800 shadow-[0_0_40px_rgba(0,0,0,0.8)]'
                    : 'w-full'
                }`}
              >
                <iframe
                  key={iframeKey}
                  ref={iframeRef}
                  src={activeItem.content}
                  title={activeItem.title}
                  onLoad={() => setIframeLoading(false)}
                  allow="fullscreen; clipboard-read; clipboard-write; camera; microphone; geolocation"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-downloads"
                  className="w-full h-full border-0 bg-white"
                />
              </div>
            </div>
          </>
        ) : (
          /* 空状态引导 */
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-zinc-500">
            <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 mb-3">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-200 mb-1">当前所选分类暂无项目</h3>
            <p className="text-xs text-zinc-500 max-w-sm mb-4">
              请点击左侧「选择分类」按钮，切换或勾选您需要浏览的工作空间分类。
            </p>
            <button
              onClick={handleOpenCategoryModal}
              className="px-3.5 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-500 transition-colors shadow-sm"
            >
              打开分类详情与筛选
            </button>
          </div>
        )}
      </section>

      {/* 弹窗：工作空间分类详情与持久化筛选 */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-2xl bg-[#121216] border border-[#27272a] rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
            {/* 弹窗头部 */}
            <div className="p-4 border-b border-[#27272a] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 text-base">
                  🗂️
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    工作空间分类详情与筛选
                    <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      自动持久化到数据库
                    </span>
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    选择您想在导航台中显示的项目分类，系统会记住并在下一次打开时保持这些分类。
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 弹窗主体：分类卡片列表 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              {/* 1. 全部工作空间卡片 */}
              {(() => {
                const isAllSelected = tempSelectedCategories.includes('all');
                return (
                  <div
                    onClick={() => handleToggleCategory('all')}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isAllSelected
                        ? 'bg-blue-600/15 border-blue-500/60 shadow-[0_0_15px_rgba(59,130,246,0.1)]'
                        : 'bg-[#18181c]/70 hover:bg-[#18181c] border-[#27272a] hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center text-base shrink-0">
                        🌟
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">全部工作空间 (All)</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                            共 {items.length} 个项目
                          </span>
                        </div>
                        <div className="text-[11px] text-zinc-400 mt-0.5">
                          展示所有工作空间下的全部常用网站与系统前端
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectOnlyCategory('all');
                        }}
                        className="text-[11px] px-2.5 py-1 rounded bg-zinc-800 hover:bg-blue-600 hover:text-white text-zinc-300 transition-colors border border-zinc-700"
                      >
                        仅选此项
                      </button>
                      <div className="text-blue-400">
                        {isAllSelected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5 text-zinc-600" />}
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="h-px bg-zinc-800/80 my-1" />

              {/* 2. 各个细分工作空间卡片 */}
              {categoryDetails.map((cat) => {
                const isSelected =
                  tempSelectedCategories.includes('all') || tempSelectedCategories.includes(cat.slug);

                return (
                  <div
                    key={cat.slug}
                    onClick={() => handleToggleCategory(cat.slug)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col gap-2.5 ${
                      isSelected
                        ? 'bg-blue-600/10 border-blue-500/50 shadow-sm'
                        : 'bg-[#18181c]/70 hover:bg-[#18181c] border-[#27272a] hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className="w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center text-base shrink-0 mt-0.5">
                          {cat.icon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-white">{cat.name}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                              {cat.total} 个项目
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              {cat.online} 在线
                            </span>
                          </div>
                          <div className="text-[11px] text-zinc-400 mt-1">{cat.desc}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectOnlyCategory(cat.slug);
                          }}
                          className="text-[11px] px-2.5 py-1 rounded bg-zinc-800 hover:bg-blue-600 hover:text-white text-zinc-300 transition-colors border border-zinc-700"
                        >
                          仅选此项
                        </button>
                        <div className="text-blue-400">
                          {isSelected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5 text-zinc-600" />}
                        </div>
                      </div>
                    </div>

                    {/* 项目标签预览 */}
                    <div className="flex items-center gap-1.5 flex-wrap pl-12">
                      {cat.sampleTitles.map((title) => (
                        <span
                          key={title}
                          className="text-[10px] px-2 py-0.5 rounded bg-zinc-900/90 text-zinc-400 border border-zinc-800 truncate max-w-[200px]"
                        >
                          {title}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 弹窗底部操作条 */}
            <div className="p-3.5 border-t border-[#27272a] bg-[#0d0d10] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <button
                  onClick={() => setTempSelectedCategories(['all'])}
                  className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs transition-colors"
                >
                  全选全部
                </button>
                <span className="text-zinc-500">|</span>
                <span>
                  已选择{' '}
                  <strong className="text-white">
                    {tempSelectedCategories.includes('all') ? '全部' : `${tempSelectedCategories.length} 个分类`}
                  </strong>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-zinc-700 hover:bg-zinc-800 text-xs text-zinc-300 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={async () => {
                    await handleApplyCategories(tempSelectedCategories);
                    setIsCategoryModalOpen(false);
                  }}
                  disabled={isSavingPreference}
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  {isSavingPreference ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>保存并在下次保持</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
