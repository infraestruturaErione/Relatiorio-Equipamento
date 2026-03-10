import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api';
import Layout from '../components/Layout';
import StatusBadge from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import type { EquipmentConfig, Project } from '../types';

export default function ProjectDetailsPage() {
  const { id } = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [rows, setRows] = useState<EquipmentConfig[]>([]);
  const [error, setError] = useState('');
  const { user } = useAuth();

  const summary = useMemo(() => {
    const total = rows.length;
    const pending = rows.filter((row) => row.status === 'PENDING').length;
    const approved = rows.filter((row) => row.status === 'APPROVED').length;
    const rejected = rows.filter((row) => row.status === 'REJECTED').length;
    return { total, pending, approved, rejected };
  }, [rows]);

  useEffect(() => {
    if (!id) return;

    Promise.all([
      api.get(`/projects/${id}`),
      api.get('/configs', { params: { project_id: id } }),
    ])
      .then(([projectRes, configsRes]) => {
        setProject(projectRes.data as Project);
        setRows(configsRes.data as EquipmentConfig[]);
      })
      .catch((err) => {
        setError(err?.response?.data?.message || 'Falha ao carregar projeto.');
      });
  }, [id]);

  const handleDeleteConfig = async (configId: number) => {
    const confirmed = window.confirm('Deseja realmente excluir esta configuracao?');
    if (!confirmed || !id) return;

    setError('');
    try {
      await api.delete(`/configs/${configId}`);
      const configsRes = await api.get('/configs', { params: { project_id: id } });
      setRows(configsRes.data as EquipmentConfig[]);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Falha ao excluir configuracao.');
    }
  };

  return (
    <Layout>
      <div className="page-header">
        <h2>Projeto {project?.name || `#${id}`}</h2>
        <p className="muted">Cliente: {project?.client_name || '-'}</p>
      </div>

      <div className="card">
        <Link to="/projects">Voltar para Projetos</Link>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="grid">
        <div className="card stat stat-total">
          <h3>Total Configs</h3>
          <strong>{summary.total}</strong>
        </div>
        <div className="card stat stat-pending">
          <h3>Pendentes</h3>
          <strong>{summary.pending}</strong>
        </div>
        <div className="card stat stat-approved">
          <h3>Aprovadas</h3>
          <strong>{summary.approved}</strong>
        </div>
        <div className="card stat stat-rejected">
          <h3>Reprovadas</h3>
          <strong>{summary.rejected}</strong>
        </div>
      </div>

      <div className="table-wrap card">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Equipamento</th>
              <th>IP inicial</th>
              <th>IP final</th>
              <th>Status</th>
              <th>Configurado por</th>
              <th>Validado por</th>
              {user?.role === 'ADMIN' && <th>Acoes</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.id}</td>
                <td>{row.equipment}</td>
                <td className="ip-cell">{row.ip_start || '-'}</td>
                <td className="ip-cell">{row.ip_end || '-'}</td>
                <td><StatusBadge status={row.status} /></td>
                <td>{row.configured_by_name}</td>
                <td>{row.validated_by_name || '-'}</td>
                {user?.role === 'ADMIN' && (
                  <td>
                    <button
                      type="button"
                      className="danger"
                      onClick={() => handleDeleteConfig(row.id)}
                    >
                      Excluir
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={user?.role === 'ADMIN' ? 8 : 7} className="empty-row">
                  Ainda nao existe configuracao dentro deste projeto.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}
