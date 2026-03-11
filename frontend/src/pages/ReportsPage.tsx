import { useEffect, useMemo, useState } from 'react';
import api from '../api';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import MaskedText from '../components/MaskedText';
import Pagination from '../components/Pagination';
import type { Client, EquipmentConfig, Project } from '../types';

function downloadBlob(blob: Blob, fileName: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
}

export default function ReportsPage() {
  const [clientId, setClientId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [status, setStatus] = useState('');
  const [query, setQuery] = useState('');
  const [createdFrom, setCreatedFrom] = useState('');
  const [createdTo, setCreatedTo] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [rows, setRows] = useState<EquipmentConfig[]>([]);
  const [selected, setSelected] = useState<EquipmentConfig | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [error, setError] = useState('');

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
    if (status) params.status = status;
    if (query) params.q = query;
    if (createdFrom) params.created_from = createdFrom;
    if (createdTo) params.created_to = createdTo;
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
    setError('');
    try {
      const response = await api.get('/configs/export/excel', {
        params: buildParams(),
        responseType: 'blob',
      });
      downloadBlob(response.data as Blob, 'configs-filtradas.xlsx');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Falha ao exportar Excel.');
    }
  };

  const exportPdf = async () => {
    setError('');
    try {
      const response = await api.get('/configs/export/pdf', {
        params: buildParams(),
        responseType: 'blob',
      });
      downloadBlob(response.data as Blob, 'relatorio-filtrado.pdf');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Falha ao exportar PDF.');
    }
  };

  return (
    <Layout>
      <div className="page-header">
        <h2>Relatorios</h2>
        <p className="muted">Exportacao com filtros aplicados, periodo e total consolidado.</p>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="card filters filters-report-advanced">
        <div className="form-field">
          <label className="field-label" htmlFor="client-filter">Cliente</label>
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
          <label className="field-label" htmlFor="project-filter">Projeto</label>
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
          <label className="field-label" htmlFor="status-filter">Status</label>
          <select id="status-filter" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Todos</option>
            <option value="PENDING">Pendente</option>
            <option value="APPROVED">Aprovado</option>
            <option value="REJECTED">Reprovado</option>
          </select>
        </div>

        <div className="form-field">
          <label className="field-label" htmlFor="search-filter">Busca</label>
          <input
            id="search-filter"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cliente, projeto, IP, VLAN, servico"
          />
        </div>

        <div className="form-field">
          <label className="field-label" htmlFor="date-from-filter">De</label>
          <input id="date-from-filter" type="date" value={createdFrom} onChange={(e) => setCreatedFrom(e.target.value)} />
        </div>

        <div className="form-field">
          <label className="field-label" htmlFor="date-to-filter">Ate</label>
          <input id="date-to-filter" type="date" value={createdTo} onChange={(e) => setCreatedTo(e.target.value)} />
        </div>

        <button type="button" onClick={load}>Buscar</button>
        <button type="button" onClick={exportExcel}>Exportar Excel</button>
        <button type="button" onClick={exportPdf}>Exportar PDF</button>
      </div>

      <div className="card report-summary">
        <strong>Total encontrado: {rows.length}</strong>
        <span className="muted">
          Periodo: {createdFrom || '-'} ate {createdTo || '-'}
        </span>
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
                <td>{item.mask}</td>
                <td>{item.gateway}</td>
                <td>{item.vlan}</td>
                <td>{item.service}</td>
                <td>{item.status}</td>
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
