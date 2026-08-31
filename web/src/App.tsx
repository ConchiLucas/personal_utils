import { useState, useEffect } from 'react';
import { TopNav } from './components/layout/TopNav';
import { HomeHub } from './components/home/HomeHub';
import { WorkspaceSidebar } from './components/workspace/WorkspaceSidebar';
import { ContainerTable } from './components/container/ContainerTable';
import { LogDrawer } from './components/container/LogDrawer';
import { NotesHub } from './components/notes/NotesHub';
import { ProjectsOverview } from './components/project-overview/ProjectsOverview';
import { AgileRequestManager } from './components/agile-request/AgileRequestManager';
import { ScriptHub } from './components/scripts/ScriptHub';
import { FileManager } from './components/files/FileManager';
import { ConfigManager } from './components/config-manager/ConfigManager';
import { Workspace, ContainerInfo, MainNavTab } from './types';
import { api } from './api/client';

export function App() {
  const [activeTab, setActiveTab] = useState<MainNavTab>('home');
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>('all-workspaces');
  const [containers, setContainers] = useState<ContainerInfo[]>([]);
  const [logContainer, setLogContainer] = useState<ContainerInfo | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [containerCounts, setContainerCounts] = useState<Record<string, number>>({});

  // Fetch Workspaces
  const loadWorkspaces = async () => {
    try {
      const data = await api.getWorkspaces();
      setWorkspaces(data);
      if (data.length > 0 && !selectedWorkspace) {
        const defaultWs = data.find((w) => w.is_default) || data[0];
        setSelectedWorkspace(defaultWs.slug);
      }
    } catch (err) {
      console.error('Failed to load workspaces:', err);
    }
  };

  // Fetch Containers
  const loadContainers = async () => {
    try {
      const res = await api.getContainers(selectedWorkspace);
      setContainers(res.data || []);
      setContainerCounts((prev) => ({
        ...prev,
        [selectedWorkspace]: res.data?.length || 0,
      }));
    } catch (err) {
      console.error('Failed to load containers:', err);
    }
  };

  useEffect(() => {
    loadWorkspaces();
  }, []);

  useEffect(() => {
    if (selectedWorkspace && activeTab === 'containers') {
      loadContainers();
    }
  }, [selectedWorkspace, activeTab]);

  // Handle Workspace Add
  const handleAddWorkspace = async (name: string, slug: string, desc: string) => {
    try {
      const newWs = await api.createWorkspace({
        name,
        slug,
        description: desc,
        host_type: 'local_docker',
        color: 'sky',
      });
      setWorkspaces((prev) => [...prev, newWs]);
      setSelectedWorkspace(newWs.slug);
    } catch (err: any) {
      alert(`创建工作空间失败: ${err.message}`);
    }
  };

  // Handle Workspace Delete
  const handleDeleteWorkspace = async (id: number) => {
    try {
      await api.deleteWorkspace(id);
      setWorkspaces((prev) => prev.filter((w) => w.id !== id));
      if (workspaces.length > 0) {
        setSelectedWorkspace(workspaces[0].slug);
      }
    } catch (err: any) {
      alert(`删除工作空间失败: ${err.message}`);
    }
  };

  // Handle Container Actions (start / stop / restart)
  const handleContainerAction = async (containerId: string, action: 'start' | 'stop' | 'restart') => {
    setActionLoadingId(containerId);
    try {
      await api.containerAction(containerId, action);
      setTimeout(() => {
        loadContainers();
        setActionLoadingId(null);
      }, 1200);
    } catch (err: any) {
      alert(`操作失败: ${err.message}`);
      setActionLoadingId(null);
    }
  };

  const currentWorkspaceObj = workspaces.find((w) => w.slug === selectedWorkspace);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#09090b]">
      {/* Clean Top Header Navigation */}
      <TopNav activeTab={activeTab} onSelectTab={setActiveTab} />

      {/* Main Content Area */}
      <main className="flex-1 flex overflow-hidden">
        {activeTab === 'home' && <HomeHub />}

        {activeTab === 'containers' && (
          <>
            {/* Left Sidebar Workspace Selector */}
            <WorkspaceSidebar
              workspaces={workspaces}
              selectedWorkspace={selectedWorkspace}
              onSelectWorkspace={setSelectedWorkspace}
              onAddWorkspace={handleAddWorkspace}
              onDeleteWorkspace={handleDeleteWorkspace}
              containerCounts={containerCounts}
            />

            {/* Right Container Data Table */}
            <ContainerTable
              containers={containers}
              workspaceName={currentWorkspaceObj?.name || selectedWorkspace}
              onOpenLogs={(c) => setLogContainer(c)}
              onAction={handleContainerAction}
              actionLoadingId={actionLoadingId}
            />
          </>
        )}

        {activeTab === 'projects' && <ProjectsOverview />}

        {activeTab === 'notes' && <NotesHub />}

        {activeTab === 'agile_request' && <AgileRequestManager />}

        {activeTab === 'scripts' && <ScriptHub />}

        {activeTab === 'files' && <FileManager />}

        {activeTab === 'services' && <ConfigManager />}
      </main>

      {/* Slide-out Terminal Log Drawer */}
      <LogDrawer
        container={logContainer}
        onClose={() => setLogContainer(null)}
      />
    </div>
  );
}
export default App;
