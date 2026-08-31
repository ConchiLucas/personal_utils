import { 
  Workspace, 
  ContainersResponse, 
  Note, 
  AgileRequestLog, 
  AgileRequestHistoryResponse,
  ScriptCategory,
  ScriptItem,
  ScriptExecutionLog,
  ScriptRunResponse,
  DashboardResponse,
  FileRecord,
  ServiceConfig,
  ProjectDirectory,
  ProjectService
} from '../types';

const API_BASE = '/api';

export const api = {
  async getWorkspaces(): Promise<Workspace[]> {
    const res = await fetch(`${API_BASE}/workspaces`);
    if (!res.ok) throw new Error('Failed to fetch workspaces');
    const json = await res.json();
    return json.data || [];
  },

  async createWorkspace(data: Partial<Workspace>): Promise<Workspace> {
    const res = await fetch(`${API_BASE}/workspaces`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create workspace');
    const json = await res.json();
    return json.data;
  },

  async deleteWorkspace(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/workspaces/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete workspace');
  },

  async getContainers(workspace: string = 'all-workspaces'): Promise<ContainersResponse> {
    const res = await fetch(`${API_BASE}/containers?workspace=${encodeURIComponent(workspace)}`);
    if (!res.ok) throw new Error('Failed to fetch containers');
    return res.json();
  },

  async getContainerLogs(containerId: string, tail: number = 200): Promise<{ logs: string; container_id: string }> {
    const res = await fetch(`${API_BASE}/containers/${containerId}/logs?tail=${tail}`);
    if (!res.ok) throw new Error('Failed to fetch container logs');
    return res.json();
  },

  async containerAction(containerId: string, action: 'start' | 'stop' | 'restart'): Promise<void> {
    const res = await fetch(`${API_BASE}/containers/${containerId}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || `Failed to ${action} container`);
    }
  },

  async pingTest(host: string, port: number): Promise<{ connected: boolean; latency: number; message?: string; error?: string }> {
    const res = await fetch(`${API_BASE}/diagnostics/ping`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ host, port, timeout: 2000 }),
    });
    return res.json();
  },

  // Notes API
  async getNotes(category?: string): Promise<Note[]> {
    const url = category && category !== 'All' 
      ? `${API_BASE}/notes?category=${encodeURIComponent(category)}`
      : `${API_BASE}/notes`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch notes');
    const json = await res.json();
    return json.data || [];
  },

  async getNote(id: number): Promise<Note> {
    const res = await fetch(`${API_BASE}/notes/${id}`);
    if (!res.ok) throw new Error('Failed to fetch note');
    const json = await res.json();
    return json.data;
  },

  async createNote(data: Partial<Note>): Promise<Note> {
    const res = await fetch(`${API_BASE}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create note');
    const json = await res.json();
    return json.data;
  },

  async deleteNote(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/notes/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete note');
  },

  // Agile Request (敏捷请求) API
  async sendAgileRequest(data: {
    method: string;
    url: string;
    request_headers?: string;
    request_body?: string;
  }): Promise<AgileRequestLog> {
    const res = await fetch(`${API_BASE}/agile-request/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || '请求发送失败');
    return json.data;
  },

  async getAgileRequestHistory(params?: {
    page?: number;
    page_size?: number;
    keyword?: string;
    method?: string;
    is_success?: number;
  }): Promise<AgileRequestHistoryResponse> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.page_size) query.set('page_size', String(params.page_size));
    if (params?.keyword) query.set('keyword', params.keyword);
    if (params?.method) query.set('method', params.method);
    if (params?.is_success !== undefined) query.set('is_success', String(params.is_success));

    const url = `${API_BASE}/agile-request/history?${query.toString()}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch agile request history');
    const json = await res.json();
    return json.data || { list: [], total: 0, page: 1, page_size: 50 };
  },

  async getAgileRequestDetail(id: number): Promise<AgileRequestLog> {
    const res = await fetch(`${API_BASE}/agile-request/detail?id=${id}`);
    if (!res.ok) throw new Error('Failed to fetch agile request detail');
    const json = await res.json();
    return json.data;
  },

  async deleteAgileRequestHistory(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/agile-request/delete?id=${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete agile request history');
  },

  async clearAgileRequestHistory(): Promise<void> {
    const res = await fetch(`${API_BASE}/agile-request/clear`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to clear agile request history');
  },

  // Script Hub (脚本库) API
  async getScriptCategories(): Promise<ScriptCategory[]> {
    const res = await fetch(`${API_BASE}/scripts/categories`);
    if (!res.ok) throw new Error('Failed to fetch script categories');
    const json = await res.json();
    return json.data || [];
  },

  async createScriptCategory(data: Partial<ScriptCategory>): Promise<ScriptCategory> {
    const res = await fetch(`${API_BASE}/scripts/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || 'Failed to create script category');
    }
    const json = await res.json();
    return json.data;
  },

  async deleteScriptCategory(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/scripts/categories/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete script category');
  },

  async getScripts(params?: { category_id?: number; category_slug?: string; keyword?: string; exec_mode?: string }): Promise<ScriptItem[]> {
    const query = new URLSearchParams();
    if (params?.category_id) query.set('category_id', String(params.category_id));
    if (params?.category_slug) query.set('category_slug', params.category_slug);
    if (params?.keyword) query.set('keyword', params.keyword);
    if (params?.exec_mode) query.set('exec_mode', params.exec_mode);

    const res = await fetch(`${API_BASE}/scripts?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch scripts');
    const json = await res.json();
    return json.data || [];
  },

  async getScript(id: number): Promise<ScriptItem> {
    const res = await fetch(`${API_BASE}/scripts/${id}`);
    if (!res.ok) throw new Error('Failed to fetch script detail');
    const json = await res.json();
    return json.data;
  },

  async createScript(data: Partial<ScriptItem>): Promise<ScriptItem> {
    const res = await fetch(`${API_BASE}/scripts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || 'Failed to create script');
    }
    const json = await res.json();
    return json.data;
  },

  async updateScript(id: number, data: Partial<ScriptItem>): Promise<ScriptItem> {
    const res = await fetch(`${API_BASE}/scripts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || 'Failed to update script');
    }
    const json = await res.json();
    return json.data;
  },

  async deleteScript(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/scripts/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete script');
  },

  async runScript(id: number, params?: Record<string, any>): Promise<ScriptRunResponse> {
    const res = await fetch(`${API_BASE}/scripts/${id}/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ params: params || {} }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || '脚本执行失败');
    return json.data;
  },

  async getScriptLogs(id: number): Promise<ScriptExecutionLog[]> {
    const res = await fetch(`${API_BASE}/scripts/${id}/logs`);
    if (!res.ok) throw new Error('Failed to fetch script logs');
    const json = await res.json();
    return json.data || [];
  },

  async openSystemPath(path: string): Promise<void> {
    const res = await fetch(`${API_BASE}/system/open`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || 'Failed to open path in system');
    }
  },

  async getDashboardItems(): Promise<DashboardResponse> {
    const res = await fetch(`${API_BASE}/dashboard/items`);
    if (!res.ok) throw new Error('Failed to fetch dashboard items');
    const json = await res.json();
    return json.data || { website: [], account: [], command: [], path: [], document: [] };
  },

  async uploadFiles(files: File[]): Promise<FileRecord[]> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    const res = await fetch(`${API_BASE}/files/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || '文件上传失败');
    }
    const json = await res.json();
    return json.data || [];
  },

  async getFiles(params?: { keyword?: string; ext?: string }): Promise<FileRecord[]> {
    const query = new URLSearchParams();
    if (params?.keyword) query.set('keyword', params.keyword);
    if (params?.ext) query.set('ext', params.ext);

    const res = await fetch(`${API_BASE}/files?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch files');
    const json = await res.json();
    return json.data || [];
  },

  async deleteFile(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/files/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || '删除文件失败');
    }
  },

  async getFileContent(id: number): Promise<{ id: number; file_name: string; ext: string; content: string; mime_type: string }> {
    const res = await fetch(`${API_BASE}/files/${id}/content`);
    if (!res.ok) throw new Error('Failed to fetch file content');
    const json = await res.json();
    return json.data;
  },

  async updateFileContent(id: number, content: string): Promise<FileRecord> {
    const res = await fetch(`${API_BASE}/files/${id}/content`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || 'Failed to update file content');
    }
    const json = await res.json();
    return json.data;
  },

  // Service Config & Process Management
  async getServiceConfigs(): Promise<ServiceConfig[]> {
    const res = await fetch(`${API_BASE}/service-configs`);
    if (!res.ok) throw new Error('获取服务配置列表失败');
    const json = await res.json();
    return json.data || [];
  },

  async getServiceConfigFile(id: number): Promise<{ id: number; name: string; config_path: string; content: string }> {
    const res = await fetch(`${API_BASE}/service-configs/${id}/config`);
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || '读取配置文件失败');
    }
    const json = await res.json();
    return json.data;
  },

  async updateServiceConfigFile(id: number, content: string): Promise<void> {
    const res = await fetch(`${API_BASE}/service-configs/${id}/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || '保存配置文件失败');
    }
  },

  async executeServiceAction(id: number, action: 'start' | 'stop' | 'restart'): Promise<{ message: string; output: string; data: ServiceConfig }> {
    const res = await fetch(`${API_BASE}/service-configs/${id}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error || `${action} 服务失败`);
    }
    return json;
  },

  // Project Overview (服务概览) API
  async getProjectDirectories(): Promise<ProjectDirectory[]> {
    const res = await fetch(`${API_BASE}/project-directories`);
    if (!res.ok) throw new Error('Failed to fetch project directories');
    const json = await res.json();
    return json.data || [];
  },

  async getProjectServices(params?: { directory_id?: number; directory_slug?: string }): Promise<ProjectService[]> {
    const query = new URLSearchParams();
    if (params?.directory_id) query.set('directory_id', String(params.directory_id));
    if (params?.directory_slug) query.set('directory_slug', params.directory_slug);

    const res = await fetch(`${API_BASE}/project-services?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch project services');
    const json = await res.json();
    return json.data || [];
  },

  async createProjectDirectory(data: Partial<ProjectDirectory>): Promise<ProjectDirectory> {
    const res = await fetch(`${API_BASE}/project-directories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || 'Failed to create project directory');
    }
    const json = await res.json();
    return json.data;
  },

  async updateProjectDirectory(id: number, data: Partial<ProjectDirectory>): Promise<ProjectDirectory> {
    const res = await fetch(`${API_BASE}/project-directories/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || 'Failed to update project directory');
    }
    const json = await res.json();
    return json.data;
  },

  async deleteProjectDirectory(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/project-directories/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete project directory');
  },

  async createProjectService(data: Partial<ProjectService>): Promise<ProjectService> {
    const res = await fetch(`${API_BASE}/project-services`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || 'Failed to create project service');
    }
    const json = await res.json();
    return json.data;
  },

  async updateProjectService(id: number, data: Partial<ProjectService>): Promise<ProjectService> {
    const res = await fetch(`${API_BASE}/project-services/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || 'Failed to update project service');
    }
    const json = await res.json();
    return json.data;
  },

  async deleteProjectService(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/project-services/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete project service');
  },
};




