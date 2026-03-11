import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import Layout from '../components/Layout';
import Pagination from '../components/Pagination';
import StatusBadge from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import type { AuditLog, EquipmentConfig } from '../types';

export default function HistoryPage() {
  const [data, setData] = useState<EquipmentConfig[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const { user } = useAuth();

  const load = () => {
    Promise.all([
      api.get('/configs', { params: query ? { q: query } : {} }),
      api.get('/audit', { params: query ? { q: query } : {} }),
    ]).then(([configsRes, auditRes]) => {
      setData(configsRes.data as EquipmentConfig[]);
      setAuditLogs(auditRes.data as AuditLog[]);
      setPage(1);
    });
  };

  useEffect(() => {
    load();
  }, [query]);

  const handleDeleteConfig = async (id: number) => {
    const confirmed = window.confirm('Deseja realmente excluir esta configuracao?');
    if (!confirmed) return;
    setError('');
    try {
      await api.delete(`/configs/${id}`);
      load();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Falha ao excluir configuracao.');
    }
  };

  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return data.slice(start, start + pageSize);
  }, [data, page, pageSize]);

  return (
    <Layout>
      <div className="page-header">
        <h2>Historico</h2>
        <p className="muted">Busca por cliente, projeto, IP, VLAN, servico ou equipamento.</p>
      </div>
      {error && <p className="error">{error}</p>}

      <div className="card">
        <div className="form-field">
          <label className="field-label" htmlFor="history-search">Busca</label>
          <input
            id="history-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ex: Cliente Alfa, P10, 192.168.0.10, VLAN 120"
          />
        </div>
      </div>

      <div className="table-wrap card">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Client</th>
              <th>Project</th>
              <th>Equipamento</th>
              <th>Status</th>
              <th>Configurado por</th>
              <th>Validado por</th>
              <th>Observacoes</th>
              <th>Detalhes</th>
              {user?.role === 'ADMIN' && <th>Acoes</th>}
            </tr>
          </thead>
          <tbody>
            {pagedRows.map((item) => (
              <tr key={item.id}>
                <td>{item.id}</td>
                <td>{item.client_name || '-'}</td>
                <td>{item.project_name || '-'}</td>
                <td>{item.equipment}</td>
                <td><StatusBadge status={item.status} /></td>
                <td>{item.configured_by_name}</td>
                <td>{item.validated_by_name || '-'}</td>
                <td>{item.notes || '-'}</td>
                <td>
                  <Link className="link-btn" to={`/configs/${item.id}`}>
                    Abrir
                  </Link>
                </td>
                {user?.role === 'ADMIN' && (
                  <td>
                    <button
                      type="button"
                      className="danger"
                      onClick={() => handleDeleteConfig(item.id)}
                    >
                      Excluir
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {pagedRows.length === 0 && (
              <tr>
                <td colSpan={user?.role === 'ADMIN' ? 10 : 9} className="empty-row">
                  Nenhum historico encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination
        page={page}
        pageSize={pageSize}
        total={data.length}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />

      <div className="card">
        <h3>Auditoria</h3>
        <div className="search-list">
          {auditLogs.map((log) => (
            <span key={log.id}>
              {new Date(log.changed_at).toLocaleString()} - {log.summary} - {log.changed_by_name || 'Sistema'}
            </span>
          ))}
          {auditLogs.length === 0 && <p className="muted">Sem eventos de auditoria.</p>}
        </div>
      </div>
    </Layout>
  );
}
