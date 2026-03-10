import { useEffect, useMemo, useState } from 'react';
import api from '../api';
import Layout from '../components/Layout';
import MaskedText from '../components/MaskedText';
import Pagination from '../components/Pagination';
import StatusBadge from '../components/StatusBadge';
import type { Client, EquipmentConfig, Project, Status } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

function downloadBlob(blob: Blob, fileName: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  window.URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const [equipment, setEquipment] = useState('');
  const [ip, setIp] = useState('');
  const [status, setStatus] = useState('');
  const [clientId, setClientId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [rows, setRows] = useState<EquipmentConfig[]>([]);
  const [selected, setSelected] = useState<EquipmentConfig | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filteredProjects = useMemo(
    () =>
      projects.filter((project) =>
        clientId ? String(project.client_id) === clientId : true
      ),
    [projects, clientId]
  );

  const buildParams = () => {
    const params: Record<string, string> = {};
    if (equipment) params.equipment = equipment;
    if (ip) params.ip = ip;
    if (status) params.status = status;
    if (clientId) params.client_id = clientId;
    if (projectId) params.project_id = projectId;
    return params;
  };

  const load = async () => {
    const response = await api.get('/configs', { params: buildParams() });
    setRows(response.data as EquipmentConfig[]);
    setPage(1);
  };

  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, page, pageSize]);

  useEffect(() => {
    Promise.all([api.get('/clients'), api.get('/projects')]).then(([clientsRes, projectsRes]) => {
      setClients(clientsRes.data as Client[]);
      setProjects(projectsRes.data as Project[]);
    });
  }, []);

  useEffect(() => {
    load();
  }, []);

  const exportExcel = async () => {
    const response = await api.get(`${API_URL}/configs/export/excel`, {
      params: buildParams(),
      responseType: 'blob',
    });
    downloadBlob(response.data as Blob, 'configs-filtradas.xlsx');
  };

  const exportPdf = async () => {
    const response = await api.get(`${API_URL}/configs/export/pdf`, {
      params: buildParams(),
      responseType: 'blob',
    });
    downloadBlob(response.data as Blob, 'relatorio-filtrado.pdf');
  };

  return (
    <Layout>
      <div className="page-header">
        <h2>Relatorios</h2>
        <p className="muted">Consulta e exportacao com filtros completos.</p>
      </div>

      <div className="info-banner">
        Regra de validacao: o mesmo analista que configurou nao pode validar/reprovar.
      </div>

      <div className="card filters filters-report">
        <div className="form-field">
          <label className="field-label" htmlFor="client-filter">
            Cliente
          </label>
          <select
            id="client-filter"
            value={clientId}
            onChange={(e) => {
              setClientId(e.target.value);
              setProjectId('');
            }}
          >
            <option value="">Todos</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-field">
          <label className="field-label" htmlFor="project-filter">
            Projeto
          </label>
          <select
            id="project-filter"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
          >
            <option value="">Todos</option>
            {filteredProjects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-field">
          <label className="field-label" htmlFor="equipment-search">
            Equipamento
          </label>
          <input
            id="equipment-search"
            value={equipment}
            onChange={(e) => setEquipment(e.target.value)}
            placeholder="Ex: PDU-RACK-01"
          />
        </div>

        <div className="form-field">
          <label className="field-label" htmlFor="ip-search">
            IP
          </label>
          <input
            id="ip-search"
            value={ip}
            onChange={(e) => setIp(e.target.value)}
            placeholder="Ex: 192.168.0.10"
          />
        </div>

        <div className="form-field">
          <label className="field-label" htmlFor="status-filter">
            Status
          </label>
          <select
            id="status-filter"
            value={status}
            onChange={(e) => setStatus(e.target.value as Status | '')}
          >
            <option value="">Todos</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>

        <button type="button" onClick={load}>Buscar</button>
        <button type="button" onClick={exportExcel}>Exportar Excel</button>
        <button type="button" onClick={exportPdf}>Exportar PDF</button>
      </div>

      <div className="table-wrap card">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Cliente</th>
              <th>Projeto</th>
              <th>Equipamento</th>
              <th>Service</th>
              <th>IP inicial</th>
              <th>IP final</th>
              <th>Status</th>
              <th>Configurado por</th>
              <th>Validado por</th>
              <th>Detalhes</th>
            </tr>
          </thead>
          <tbody>
            {pagedRows.map((item) => (
              <tr key={item.id}>
                <td>{item.id}</td>
                <td>{item.client_name || '-'}</td>
                <td>{item.project_name || '-'}</td>
                <td>{item.equipment}</td>
                <td>{item.service}</td>
                <td className="ip-cell">{item.ip_start || '-'}</td>
                <td className="ip-cell">{item.ip_end || '-'}</td>
                <td><StatusBadge status={item.status} /></td>
                <td>{item.configured_by_name}</td>
                <td>{item.validated_by_name || '-'}</td>
                <td>
                  <button type="button" className="icon-btn" onClick={() => setSelected(item)} title="Ver detalhes">
                    Ver
                  </button>
                </td>
              </tr>
            ))}
            {pagedRows.length === 0 && (
              <tr>
                <td colSpan={11} className="empty-row">
                  Nenhum registro encontrado para o filtro atual.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination
        page={page}
        pageSize={pageSize}
        total={rows.length}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal-card card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>Configuracao #{selected.id}</h3>
              <button type="button" onClick={() => setSelected(null)}>Fechar</button>
            </div>
            <div className="details-grid">
              <div><strong>Cliente:</strong> {selected.client_name || '-'}</div>
              <div><strong>Projeto:</strong> {selected.project_name || '-'}</div>
              <div><strong>Equipamento:</strong> {selected.equipment}</div>
              <div><strong>IP inicial:</strong> <span className="ip-cell">{selected.ip_start || '-'}</span></div>
              <div><strong>IP final:</strong> <span className="ip-cell">{selected.ip_end || '-'}</span></div>
              <div><strong>Mask:</strong> {selected.mask}</div>
              <div><strong>Gateway:</strong> {selected.gateway}</div>
              <div><strong>VLAN:</strong> {selected.vlan}</div>
              <div><strong>Service:</strong> {selected.service}</div>
              <div><strong>MAC:</strong> {selected.mac}</div>
              <div><strong>Username:</strong> {selected.username}</div>
              <div><strong>Password:</strong> <MaskedText value={selected.password} /></div>
              <div><strong>Status:</strong> <StatusBadge status={selected.status} /></div>
              <div><strong>Configurado por:</strong> {selected.configured_by_name}</div>
              <div><strong>Validado por:</strong> {selected.validated_by_name || '-'}</div>
              <div><strong>Criado em:</strong> {new Date(selected.created_at).toLocaleString()}</div>
              <div><strong>Validado em:</strong> {selected.validated_at ? new Date(selected.validated_at).toLocaleString() : '-'}</div>
              <div className="details-notes"><strong>Observacoes:</strong> {selected.notes || '-'}</div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
