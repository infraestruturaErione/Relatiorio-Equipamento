export type Status = 'PENDING' | 'APPROVED' | 'REJECTED';
export type UserRole = 'ADMIN' | 'ANALYST';

export interface User {
  id: number;
  name: string;
  username: string;
  role: UserRole;
}

export interface EquipmentConfig {
  id: number;
  client_id: number | null;
  project_id: number | null;
  client_name?: string | null;
  project_name?: string | null;
  equipment: string;
  ip: string | null;
  mask: string;
  gateway: string;
  vlan: string;
  service: string;
  mac: string;
  username: string;
  password: string;
  configured_by: number;
  validated_by: number | null;
  status: Status;
  notes: string | null;
  created_at: string;
  updated_at?: string;
  validated_at: string | null;
  configured_by_name?: string;
  validated_by_name?: string;
}

export interface Summary {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

export interface DashboardProject {
  id: number;
  name: string;
  network_range: string;
  client_name: string;
  updated_at: string;
  total_configs: number;
  pending_configs: number;
}

export interface DashboardAnalyst {
  id: number;
  name: string;
  pending_count: number;
}

export interface DashboardClient {
  id: number;
  name: string;
  total_configs: number;
  pending_configs: number;
}

export interface DashboardData {
  summary: Summary;
  recent_projects: DashboardProject[];
  pending_by_analyst: DashboardAnalyst[];
  top_clients: DashboardClient[];
}

export interface Client {
  id: number;
  name: string;
  ip?: string | null;
  mask?: string | null;
  gateway?: string | null;
  created_at: string;
  projects_count?: number;
  configs_count?: number;
}

export interface Project {
  id: number;
  client_id: number;
  client_name?: string;
  name: string;
  network_range: string;
  mask: string;
  gateway: string;
  created_at: string;
  projects_count?: number;
  configs_count?: number;
  total_configs?: number;
  pending_configs?: number;
  approved_configs?: number;
  rejected_configs?: number;
}

export interface AuditLog {
  id: number;
  entity_type: 'client' | 'project' | 'config';
  entity_id: number;
  action: string;
  summary: string;
  changed_by: number | null;
  changed_by_name?: string | null;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  changed_at: string;
  client_name?: string | null;
  project_name?: string | null;
  equipment_name?: string | null;
}

export interface SearchClient {
  id: number;
  name: string;
  created_at: string;
}

export interface SearchProject {
  id: number;
  name: string;
  network_range: string;
  client_name: string;
}

export interface SearchConfig {
  id: number;
  equipment: string;
  ip: string | null;
  vlan: string;
  service: string;
  status: Status;
  client_name?: string | null;
  project_name?: string | null;
}

export interface GlobalSearchResult {
  clients: SearchClient[];
  projects: SearchProject[];
  configs: SearchConfig[];
}
