import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../api';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import type { EquipmentConfig, Project } from '../types';

export default function ProjectDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [rows, setRows] = useState<EquipmentConfig[]>([]);
  const [error, setError] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editNetworkRange, setEditNetworkRange] = useState('');
  const [editMask, setEditMask] = useState('');
  const [editGateway, setEditGateway] = useState('');
  const [editError, setEditError] = useState('');
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

  const openEditModal = () => {
    if (!project) return;
    setEditName(project.name);
    setEditNetworkRange(project.network_range);
    setEditMask(project.mask);
    setEditGateway(project.gateway);
    setEditError('');
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditError('');
  };

  const handleEditProject = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!project) return;

    setEditError('');
    setError('');

    try {
      await api.patch(`/projects/${project.id}`, {
        name: editName,
        network_range: editNetworkRange,
        mask: editMask,
        gateway: editGateway,
      });
      const refreshed = await api.get(`/projects/${project.id}`);
      setProject(refreshed.data as Project);
      closeEditModal();
    } catch (err: any) {
      setEditError(err?.response?.data?.message || 'Falha ao atualizar projeto.');
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
            {'<'}
          </button>

          <div className="project-client-card">
            <p className="eyebrow">Projeto</p>
            <h3>{project?.name || `#${id}`}</h3>
            {user?.role === 'ADMIN' && (
              <button type="button" onClick={openEditModal}>
                Editar projeto
              </button>
            )}
            <div className="project-client-info">
              <div>
                <span className="muted">Cliente</span>
                <strong>{project?.client_name || '-'}</strong>
              </div>
              <div>
                <span className="muted">Rede</span>
                <strong className="ip-cell">{project?.network_range || '-'}</strong>
              </div>
              <div>
                <span className="muted">Mascara</span>
                <strong className="ip-cell">{project?.mask || '-'}</strong>
              </div>
              <div>
                <span className="muted">Gateway</span>
                <strong className="ip-cell">{project?.gateway || '-'}</strong>
              </div>
              <div>
                <span className="muted">Projetos</span>
                <strong>{project?.projects_count ?? 0}</strong>
              </div>
              <div>
                <span className="muted">Configuracoes</span>
                <strong>{project?.configs_count ?? project?.total_configs ?? 0}</strong>
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

      {showEditModal && (
        <Modal title={`Editar ${project?.name || `#${id}`}`} onClose={closeEditModal}>
          <form className="config-form" onSubmit={handleEditProject}>
            <div className="form-grid">
              <div className="form-field">
                <label className="field-label" htmlFor="detail-project-name">
                  Nome do projeto
                </label>
                <input
                  id="detail-project-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                />
              </div>
              <div className="form-field">
                <label className="field-label" htmlFor="detail-project-network">
                  Rede
                </label>
                <input
                  id="detail-project-network"
                  value={editNetworkRange}
                  onChange={(e) => setEditNetworkRange(e.target.value)}
                  required
                />
              </div>
              <div className="form-field">
                <label className="field-label" htmlFor="detail-project-mask">
                  Mascara
                </label>
                <input
                  id="detail-project-mask"
                  value={editMask}
                  onChange={(e) => setEditMask(e.target.value)}
                  required
                />
              </div>
              <div className="form-field">
                <label className="field-label" htmlFor="detail-project-gateway">
                  Gateway
                </label>
                <input
                  id="detail-project-gateway"
                  value={editGateway}
                  onChange={(e) => setEditGateway(e.target.value)}
                  required
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
