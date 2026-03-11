import { useEffect, useMemo, useState } from 'react';
import api from '../api';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import MaskedText from '../components/MaskedText';
import Pagination from '../components/Pagination';
import type { Client, EquipmentConfig, Project } from '../types';

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
              <th>Mascara</th>
              <th>Gateway</th>
              <th>VLAN</th>
              <th>Service</th>
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
                <td>{item.mask}</td>
                <td>{item.gateway}</td>
                <td>{item.vlan}</td>
                <td>{item.service}</td>
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
                <td colSpan={10} className="empty-row">
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
        <Modal title={`Configuracao #${selected.id}`} onClose={() => setSelected(null)} width="lg">
          <div className="details-grid">
            <div><strong>Cliente:</strong> {selected.client_name || '-'}</div>
            <div><strong>Projeto:</strong> {selected.project_name || '-'}</div>
            <div><strong>Mask:</strong> {selected.mask}</div>
            <div><strong>Gateway:</strong> {selected.gateway}</div>
            <div><strong>VLAN:</strong> {selected.vlan}</div>
            <div><strong>Service:</strong> {selected.service}</div>
            <div><strong>MAC:</strong> {selected.mac}</div>
            <div><strong>Username:</strong> {selected.username}</div>
            <div><strong>Password:</strong> <MaskedText value={selected.password} /></div>
            <div><strong>Configurado por:</strong> {selected.configured_by_name}</div>
            <div><strong>Validado por:</strong> {selected.validated_by_name || '-'}</div>
            <div><strong>Criado em:</strong> {new Date(selected.created_at).toLocaleString()}</div>
            <div><strong>Validado em:</strong> {selected.validated_at ? new Date(selected.validated_at).toLocaleString() : '-'}</div>
            <div className="details-notes"><strong>Observacoes:</strong> {selected.notes || '-'}</div>
          </div>
        </Modal>
      )}
    </Layout>
  );
}
