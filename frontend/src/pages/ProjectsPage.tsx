import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import type { Client, Project } from '../types';
import { isValidIpv4, isValidNetworkRange } from '../utils/network';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState('');
  const [name, setName] = useState('');
  const [networkRange, setNetworkRange] = useState('');
  const [mask, setMask] = useState('');
  const [gateway, setGateway] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [filterClientId, setFilterClientId] = useState('');
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editName, setEditName] = useState('');
  const [editNetworkRange, setEditNetworkRange] = useState('');
  const [editMask, setEditMask] = useState('');
  const [editGateway, setEditGateway] = useState('');
  const [editError, setEditError] = useState('');
  const { user } = useAuth();

  const clientOptions = useMemo(
    () =>
      clients.map((client) => ({
        value: String(client.id),
        label: client.name,
      })),
    [clients]
  );

  const filteredProjects = useMemo(
    () => projects.filter((project) => (filterClientId ? String(project.client_id) === filterClientId : true)),
    [projects, filterClientId]
  );

  const loadData = async () => {
    const [projectsRes, clientsRes] = await Promise.all([api.get('/projects'), api.get('/clients')]);
    setProjects(projectsRes.data as Project[]);
    setClients(clientsRes.data as Client[]);
  };

  useEffect(() => {
    loadData();
  }, []);

  const openEditModal = (project: Project) => {
    setEditingProject(project);
    setEditName(project.name);
    setEditNetworkRange(project.network_range);
    setEditMask(project.mask);
    setEditGateway(project.gateway);
    setEditError('');
    setError('');
    setMessage('');
  };

  const closeEditModal = () => {
    setEditingProject(null);
    setEditName('');
    setEditNetworkRange('');
    setEditMask('');
    setEditGateway('');
    setEditError('');
  };

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!isValidNetworkRange(networkRange)) {
      setError('Rede invalida. Use CIDR, por exemplo 192.168.10.0/24.');
      return;
    }

    if (!isValidIpv4(mask) || !isValidIpv4(gateway)) {
      setError('Mascara e gateway devem ser IPv4 validos.');
      return;
    }

    try {
      await api.post('/projects', {
        client_id: Number(clientId),
        name,
        network_range: networkRange,
        mask,
        gateway,
      });
      setMessage('Projeto criado com sucesso.');
      setName('');
      setNetworkRange('');
      setMask('');
      setGateway('');
      setClientId('');
      await loadData();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Falha ao criar projeto.');
    }
  };

  const handleDeleteProject = async (projectId: number) => {
    const confirmed = window.confirm(
      'Deseja realmente excluir este projeto e todas as configuracoes vinculadas?'
    );
    if (!confirmed) return;

    setError('');
    setMessage('');

    try {
      await api.delete(`/projects/${projectId}`);
      setMessage('Projeto excluido com sucesso.');
      await loadData();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Falha ao excluir projeto.');
    }
  };

  const handleEditProject = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingProject) return;

    setEditError('');
    setError('');
    setMessage('');

    if (!isValidNetworkRange(editNetworkRange)) {
      setEditError('Rede invalida. Use CIDR, por exemplo 192.168.10.0/24.');
      return;
    }

    if (!isValidIpv4(editMask) || !isValidIpv4(editGateway)) {
      setEditError('Mascara e gateway devem ser IPv4 validos.');
      return;
    }

    try {
      await api.patch(`/projects/${editingProject.id}`, {
        name: editName,
        network_range: editNetworkRange,
        mask: editMask,
        gateway: editGateway,
      });
      setMessage('Projeto atualizado com sucesso.');
      closeEditModal();
      await loadData();
    } catch (err: any) {
      setEditError(err?.response?.data?.message || 'Falha ao atualizar projeto.');
    }
  };

  return (
    <Layout>
      <div className="page-header">
        <h2>Projetos</h2>
        <p className="muted">Cada projeto mostra exatamente o que ja existe dentro dele.</p>
      </div>

      <form className="card inline-form inline-form-project" onSubmit={handleCreate}>
        <div className="form-field">
          <label className="field-label" htmlFor="project-client">
            Cliente
          </label>
          <select
            id="project-client"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            required
          >
            <option value="">Selecione</option>
            {clientOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="form-field">
          <label className="field-label" htmlFor="project-name">
            Nome do projeto
          </label>
          <input
            id="project-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: P10"
            required
          />
        </div>
        <div className="form-field">
          <label className="field-label" htmlFor="project-network">
            Rede
          </label>
          <input
            id="project-network"
            value={networkRange}
            onChange={(e) => setNetworkRange(e.target.value)}
            placeholder="Ex: 192.168.10.0/24"
            required
          />
        </div>
        <div className="form-field">
          <label className="field-label" htmlFor="project-mask">
            Mascara
          </label>
          <input
            id="project-mask"
            value={mask}
            onChange={(e) => setMask(e.target.value)}
            placeholder="Ex: 255.255.255.0"
            required
          />
        </div>
        <div className="form-field">
          <label className="field-label" htmlFor="project-gateway">
            Gateway
          </label>
          <input
            id="project-gateway"
            value={gateway}
            onChange={(e) => setGateway(e.target.value)}
            placeholder="Ex: 192.168.10.1"
            required
          />
        </div>
        <button type="submit">Criar projeto</button>
        {message && <p className="success">{message}</p>}
        {error && <p className="error">{error}</p>}
      </form>

      <div className="card inline-form">
        <div className="form-field">
          <label className="field-label" htmlFor="filter-client">
            Filtrar por cliente
          </label>
          <select
            id="filter-client"
            value={filterClientId}
            onChange={(e) => setFilterClientId(e.target.value)}
          >
            <option value="">Todos</option>
            {clientOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="project-grid">
        {filteredProjects.map((project) => (
          <article key={project.id} className="card project-card">
            <h3>{project.name}</h3>
            <p className="muted">Cliente: {project.client_name}</p>
            <p className="muted">Rede: {project.network_range}</p>
            <p className="muted">Mascara: {project.mask}</p>
            <p className="muted">Gateway: {project.gateway}</p>
            <div className="project-metrics">
              <span>Total: {project.total_configs ?? 0}</span>
              <span>Pendentes: {project.pending_configs ?? 0}</span>
              <span>Aprovadas: {project.approved_configs ?? 0}</span>
              <span>Reprovadas: {project.rejected_configs ?? 0}</span>
            </div>
            <div className="project-actions">
              <Link className="link-btn" to={`/projects/${project.id}`}>
                Abrir projeto
              </Link>
              {user?.role === 'ADMIN' && (
                <button
                  type="button"
                  onClick={() => openEditModal(project)}
                >
                  Editar
                </button>
              )}
              {user?.role === 'ADMIN' && (
                <button
                  type="button"
                  className="danger"
                  onClick={() => handleDeleteProject(project.id)}
                >
                  Excluir
                </button>
              )}
            </div>
          </article>
        ))}
      </div>

      {filteredProjects.length === 0 && (
        <div className="card">
          <p className="muted">Nenhum projeto encontrado para o filtro atual.</p>
        </div>
      )}

      {editingProject && (
        <Modal title={`Editar ${editingProject.name}`} onClose={closeEditModal}>
          <form className="config-form" onSubmit={handleEditProject}>
            <div className="form-grid">
              <div className="form-field">
                <label className="field-label" htmlFor="edit-project-name">
                  Nome do projeto
                </label>
                <input
                  id="edit-project-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                />
              </div>

              <div className="form-field">
                <label className="field-label" htmlFor="edit-project-network">
                  Rede
                </label>
                <input
                  id="edit-project-network"
                  value={editNetworkRange}
                  onChange={(e) => setEditNetworkRange(e.target.value)}
                  placeholder="Ex: 192.168.10.0/24"
                  required
                />
              </div>
              <div className="form-field">
                <label className="field-label" htmlFor="edit-project-mask">
                  Mascara
                </label>
                <input
                  id="edit-project-mask"
                  value={editMask}
                  onChange={(e) => setEditMask(e.target.value)}
                  required
                />
              </div>
              <div className="form-field">
                <label className="field-label" htmlFor="edit-project-gateway">
                  Gateway
                </label>
                <input
                  id="edit-project-gateway"
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
