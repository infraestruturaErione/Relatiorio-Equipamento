export type Status = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface User {
  id: number;
  name: string;
  username: string;
}

export interface EquipmentConfig {
  id: number;
  equipment: string;
  ip: string;
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
