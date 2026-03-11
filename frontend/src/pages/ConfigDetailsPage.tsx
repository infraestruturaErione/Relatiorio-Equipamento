import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api';
import Layout from '../components/Layout';
import MaskedText from '../components/MaskedText';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import type { AuditLog, Client, EquipmentConfig, Project } from '../types';
import { isValidIpv4, isValidMac, isValidVlan } from '../utils/network';

type EditFormState = {
  client_id: string;
  project_id: string;
  equipment: string;
  ip: string;
  mask: string;
  gateway: string;
  vlan: string;
  service: string;
  mac: string;
  username: string;
  password: string;
  notes: string;
};

export default function ConfigDetailsPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [config, setConfig] = useState<EquipmentConfig | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [error, setError] = useState('');
  const [editError, setEditError] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [form, setForm] = useState<EditFormState>({
    client_id: '',
    project_id: '',
    equipment: '',
    ip: '',
    mask: '',
    gateway: '',
    vlan: '',
    service: '',
    mac: '',
    username: '',
    password: '',
    notes: '',
  });

  const projectOptions = useMemo(
    () => projects.filter((project) => String(project.client_id) === form.client_id),
    [projects, form.client_id]
  );

  const load = async () => {
    if (!id) {
      setError('ID invalido.');
      return;
    }

    try {
      const [configRes, auditRes, clientsRes, projectsRes] = await Promise.all([
        api.get(`/configs/${id}`),
        api.get('/audit', { params: { entity_type: 'config', entity_id: id } }),
        api.get('/clients'),
        api.get('/projects'),
      ]);
      setConfig(configRes.data as EquipmentConfig);
      setAuditLogs(auditRes.data as AuditLog[]);
      setClients(clientsRes.data as Client[]);
      setProjects(projectsRes.data as Project[]);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Falha ao carregar configuracao.');
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const openEditModal = () => {
    if (!config) return;
    setForm({
      client_id: String(config.client_id || ''),
      project_id: String(config.project_id || ''),
      equipment: config.equipment,
      ip: config.ip || '',
      mask: config.mask,
      gateway: config.gateway,
      vlan: config.vlan,
      service: config.service,
      mac: config.mac,
      username: config.username,
      password: config.password,
      notes: config.notes || '',
    });
    setEditError('');
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditError('');
  };

  const handleEdit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!config) return;

    if (!isValidIpv4(form.ip) || !isValidIpv4(form.mask) || !isValidIpv4(form.gateway)) {
      setEditError('IP, mascara e gateway devem ser IPv4 validos.');
      return;
    }

    if (!isValidMac(form.mac)) {
      setEditError('MAC invalido. Use AA:BB:CC:DD:EE:FF.');
      return;
    }

    if (!isValidVlan(form.vlan)) {
      setEditError('VLAN invalida. Use valores de 1 a 4094.');
      return;
    }

    try {
      await api.patch(`/configs/${config.id}`, {
        ...form,
        client_id: Number(form.client_id),
        project_id: Number(form.project_id),
      });
      closeEditModal();
      await load();
    } catch (err: any) {
      setEditError(err?.response?.data?.message || 'Falha ao atualizar configuracao.');
    }
  };

  return (
    <Layout>
      <div className="page-header">
        <h2>Detalhes da Configuracao #{id}</h2>
        <p className="muted">Tela aberta por link direto ou QR code do relatorio.</p>
      </div>

      <div className="page-actions">
        <Link className="link-btn" to="/history">Voltar para Historico</Link>
        {user?.role === 'ADMIN' && (
          <button type="button" onClick={openEditModal}>
            Editar configuracao
          </button>
        )}
      </div>

      {error && <p className="error">{error}</p>}

      {config && (
        <div className="card details-grid">
          <div><strong>Client:</strong> {config.client_name || '-'}</div>
          <div><strong>Project:</strong> {config.project_name || '-'}</div>
          <div><strong>Equipamento:</strong> {config.equipment}</div>
          <div><strong>IP:</strong> <span className="ip-cell">{config.ip || '-'}</span></div>
          <div><strong>Mask:</strong> {config.mask}</div>
          <div><strong>Gateway:</strong> {config.gateway}</div>
          <div><strong>VLAN:</strong> {config.vlan}</div>
          <div><strong>Service:</strong> {config.service}</div>
          <div><strong>MAC:</strong> {config.mac}</div>
          <div><strong>Username:</strong> {config.username}</div>
          <div><strong>Password:</strong> <MaskedText value={config.password} /></div>
          <div><strong>Status:</strong> <StatusBadge status={config.status} /></div>
          <div><strong>Configurado por:</strong> {config.configured_by_name}</div>
          <div><strong>Validado por:</strong> {config.validated_by_name || '-'}</div>
          <div><strong>Criado em:</strong> {new Date(config.created_at).toLocaleString()}</div>
          <div><strong>Atualizado em:</strong> {new Date(config.updated_at || config.created_at).toLocaleString()}</div>
          <div><strong>Validado em:</strong> {config.validated_at ? new Date(config.validated_at).toLocaleString() : '-'}</div>
          <div className="details-notes"><strong>Observacoes:</strong> {config.notes || '-'}</div>
        </div>
      )}

      <div className="card">
        <h3>Historico de alteracoes</h3>
        <div className="search-list">
          {auditLogs.map((log) => (
            <span key={log.id}>
              {new Date(log.changed_at).toLocaleString()} - {log.summary} - {log.changed_by_name || 'Sistema'}
            </span>
          ))}
          {auditLogs.length === 0 && <p className="muted">Sem alteracoes registradas.</p>}
        </div>
      </div>

      {showEditModal && (
        <Modal title={`Editar configuracao #${config?.id}`} onClose={closeEditModal} width="lg">
          <form className="config-form" onSubmit={handleEdit}>
            <div className="form-grid">
              <div className="form-field">
                <label className="field-label" htmlFor="edit-config-client">Cliente</label>
                <select
                  id="edit-config-client"
                  value={form.client_id}
                  onChange={(e) => setForm((prev) => ({ ...prev, client_id: e.target.value, project_id: '' }))}
                  required
                >
                  <option value="">Selecione</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>{client.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label className="field-label" htmlFor="edit-config-project">Projeto</label>
                <select
                  id="edit-config-project"
                  value={form.project_id}
                  onChange={(e) => setForm((prev) => ({ ...prev, project_id: e.target.value }))}
                  required
                >
                  <option value="">Selecione</option>
                  {projectOptions.map((project) => (
                    <option key={project.id} value={project.id}>{project.name}</option>
                  ))}
                </select>
              </div>
              {[
                ['equipment', 'Equipamento'],
                ['ip', 'IP'],
                ['mask', 'Mascara'],
                ['gateway', 'Gateway'],
                ['vlan', 'VLAN'],
                ['service', 'Service'],
                ['mac', 'MAC'],
                ['username', 'Username'],
                ['password', 'Password'],
              ].map(([key, label]) => (
                <div key={key} className="form-field">
                  <label className="field-label" htmlFor={`edit-config-${key}`}>{label}</label>
                  <input
                    id={`edit-config-${key}`}
                    value={form[key as keyof EditFormState]}
                    onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
                    required={key !== 'notes'}
                  />
                </div>
              ))}
              <div className="form-field">
                <label className="field-label" htmlFor="edit-config-notes">Observacoes</label>
                <textarea
                  id="edit-config-notes"
                  value={form.notes}
                  onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                />
              </div>
            </div>

            {editError && <p className="error">{editError}</p>}

            <div className="modal-actions">
              <button type="button" className="danger" onClick={closeEditModal}>
                Cancelar
              </button>
              <button type="submit">Salvar alteracoes</button>
            </div>
          </form>
        </Modal>
      )}
    </Layout>
  );
}
