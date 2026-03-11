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

export interface Client {
  id: number;
  name: string;
  ip: string;
  mask: string;
  gateway: string;
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
