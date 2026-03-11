import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../api';
import Layout from '../components/Layout';
import StatusBadge from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import type { EquipmentConfig, Project } from '../types';

export default function ProjectDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
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
      {error && <p className="error">{error}</p>}

      <div className="project-layout">
        <aside className="card project-sidebar">
          <button
            type="button"
            className="icon-nav-btn"
            onClick={() => navigate('/projects')}
            title="Voltar"
            aria-label="Voltar"
          >
            ←
          </button>

          <div className="project-client-card">
            <p className="eyebrow">Cliente</p>
            <h3>{project?.client_name || '-'}</h3>
            <div className="project-client-info">
              <div>
                <span className="muted">IP</span>
                <strong className="ip-cell">{project?.client_ip || '-'}</strong>
              </div>
              <div>
                <span className="muted">Mascara</span>
                <strong className="ip-cell">{project?.client_mask || '-'}</strong>
              </div>
              <div>
                <span className="muted">Gateway</span>
                <strong className="ip-cell">{project?.client_gateway || '-'}</strong>
              </div>
              <div>
                <span className="muted">Projetos</span>
                <strong>{project?.projects_count ?? 0}</strong>
              </div>
              <div>
                <span className="muted">Configuracoes</span>
                <strong>{project?.configs_count ?? 0}</strong>
              </div>
            </div>
          </div>
        </aside>

        <section className="project-main">
          <div className="page-header">
            <h2>Projeto {project?.name || `#${id}`}</h2>
            <p className="muted">Cliente: {project?.client_name || '-'}</p>
          </div>

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

          {rows.length === 0 ? (
            <div className="card empty-state">
              <h3>Nenhuma configuracao neste projeto ainda</h3>
              <p className="muted">Crie a primeira configuracao para comecar a preencher este projeto.</p>
              <div className="empty-state-actions">
                <Link className="link-btn" to="/new">
                  Nova Config
                </Link>
              </div>
            </div>
          ) : (
            <div className="table-wrap card">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Equipamento</th>
                    <th>IP</th>
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
                      <td className="ip-cell">{row.ip || '-'}</td>
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
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
}
