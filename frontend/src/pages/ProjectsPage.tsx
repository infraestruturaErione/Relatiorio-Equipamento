import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import type { Client, Project } from '../types';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [filterClientId, setFilterClientId] = useState('');
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

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setMessage('');

    try {
      await api.post('/projects', {
        client_id: Number(clientId),
        name,
      });
      setMessage('Projeto criado com sucesso.');
      setName('');
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
    </Layout>
  );
}
