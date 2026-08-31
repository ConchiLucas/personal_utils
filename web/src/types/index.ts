export interface Workspace {
  id: number;
  name: string;
  slug: string;
  description: string;
  host_type: string;
  endpoint: string;
  color: string;
  icon: string;
  is_default: boolean;
  sort_order: number;
  container_count?: number;
}

export interface PortMapping {
  ip: string;
  private_port: number;
  public_port: number;
  type: string;
  is_web: boolean;
  direct_url?: string;
}

export interface ContainerInfo {
  id: string;
  short_id: string;
  name: string;
  image: string;
  image_tag: string;
  state: 'running' | 'exited' | 'paused' | 'restarting' | string;
  status: string;
  created: number;
  ports: PortMapping[];
  web_port?: PortMapping;
  labels: Record<string, string>;
  cpu_percent?: number;
  memory_mb?: number;
  workspace: string;
}

export interface ContainersResponse {
  workspace: string;
  summary: {
    total: number;
    running: number;
    stopped: number;
    web_services: number;
  };
  data: ContainerInfo[];
}

export interface Note {
  id: number;
  title: string;
  slug: string;
  category: string;
  tags: string;
  content: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

export type AgileMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

export interface AgileRequestLog {
  id: number;
  created_at: string;
  updated_at: string;
  method: AgileMethod;
  url: string;
  request_headers: string;
  request_body: string;
  response_status: number;
  response_headers: string;
  response_body: string;
  duration_ms: number;
  is_success: number;
  error_message?: string;
}

export interface AgileRequestHistoryResponse {
  list: AgileRequestLog[];
  total: number;
  page: number;
  page_size: number;
}

// Script Hub Types
export interface ScriptCategory {
  id: number;
  name: string;
  slug: string;
  description: string;
  icon: string;
  color: string;
  sort_order: number;
  script_count?: number;
  created_at: string;
  updated_at: string;
}

export interface ScriptParamDef {
  key: string;
  label: string;
  type: 'string' | 'number' | 'select' | 'boolean';
  default?: string | number | boolean;
  required?: boolean;
  options?: string[];
  description?: string;
}

export interface ScriptItem {
  id: number;
  category_id: number;
  category_slug: string;
  name: string;
  description: string;
  script_type: 'bash' | 'python' | 'node' | 'sh';
  exec_mode: 'direct' | 'dynamic';
  content: string;
  params_schema?: string;
  default_params?: string;
  working_dir?: string;
  timeout_sec: number;
  last_status?: 'success' | 'failed' | 'running';
  last_run_at?: string;
  last_duration_ms?: number;
  run_count: number;
  created_at: string;
  updated_at: string;
}

export interface ScriptExecutionLog {
  id: number;
  script_id: number;
  script_name: string;
  exec_mode: string;
  params: string;
  status: 'success' | 'failed';
  exit_code: number;
  output: string;
  duration_ms: number;
  created_at: string;
}

export interface ScriptRunResponse {
  script_id: number;
  script_name: string;
  status: 'success' | 'failed';
  exit_code: number;
  output: string;
  duration_ms: number;
  run_at: string;
}

export interface DashboardItem {
  id: number;
  section: 'website' | 'account' | 'command' | 'path' | 'document';
  title: string;
  content: string;
  extra?: string;
  sort_order: number;
  is_online?: boolean;
  created_at: string;
  updated_at: string;
}

export interface DashboardResponse {
  website: DashboardItem[];
  account: DashboardItem[];
  command: DashboardItem[];
  path: DashboardItem[];
  document: DashboardItem[];
}

export interface FileRecord {
  id: number;
  file_name: string;
  original_name: string;
  file_size: number;
  mime_type: string;
  ext: string;
  bucket: string;
  object_key: string;
  url: string;
  created_at: string;
  updated_at: string;
}

export interface ServiceConfig {
  id: number;
  created_at: string;
  updated_at: string;
  name: string;
  slug: string;
  description: string;
  service_type: 'host_process' | 'brew_service' | 'docker' | 'script';
  process_pattern: string;
  port: number;
  config_path: string;
  start_cmd?: string;
  stop_cmd?: string;
  restart_cmd?: string;
  sort_order: number;
  status: 'running' | 'stopped' | 'unknown';
  pid: number;
  cpu_percent: number;
  memory_mb: number;
  uptime: string;
  config_file_exists: boolean;
}

export interface ProjectEndpoint {
  label: string;
  url: string;
}

export interface ProjectService {
  id: number;
  created_at: string;
  updated_at: string;
  directory_id: number;
  name: string;
  role: 'backend' | 'frontend' | 'worker' | 'service' | 'fullstack' | string;
  language: string;
  framework?: string;
  relative_path: string;
  port: number;
  internal_port?: number;
  description: string;
  start_cmd?: string;
  dev_cmd?: string;
  endpoints?: string; // JSON string e.g. '[{"label":"Swagger","url":"..."}]'
  sort_order: number;
  status: 'running' | 'stopped';
  absolute_path?: string;
  path_exists?: boolean;
}

export interface ProjectDirectory {
  id: number;
  created_at: string;
  updated_at: string;
  name: string;
  slug: string;
  category: string;
  path: string;
  description: string;
  icon?: string;
  sort_order: number;
  services?: ProjectService[];
  total_services?: number;
  running_services?: number;
  path_exists?: boolean;
}

export type MainNavTab = 'home' | 'containers' | 'notes' | 'projects' | 'agile_request' | 'scripts' | 'files' | 'services';


