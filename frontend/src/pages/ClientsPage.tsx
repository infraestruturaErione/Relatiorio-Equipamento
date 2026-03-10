import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import type { Client, Project } from '../types';

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState('');
  const [initialProject, setInitialProject] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const { user } = useAuth();

  const projectsByClient = useMemo(() => {
    const map = new Map<number, Project[]>();
    for (const project of projects) {
      const list = map.get(project.client_id) || [];
      list.push(project);
      map.set(project.client_id, list);
    }
    return map;
  }, [projects]);

  const loadData = async () => {
    const [clientsRes, projectsRes] = await Promise.all([api.get('/clients'), api.get('/projects')]);
    setClients(clientsRes.data as Client[]);
    setProjects(projectsRes.data as Project[]);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setMessage('');

    try {
      await api.post('/clients', { name, project_name: initialProject });
      setMessage('Cliente criado com sucesso.');
      setName('');
      setInitialProject('');
      await loadData();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Falha ao criar cliente.');
    }
  };

  const handleDeleteClient = async (clientId: number) => {
    const confirmed = window.confirm(
      'Deseja realmente excluir este cliente e todos os projetos/configuracoes vinculados?'
    );
    if (!confirmed) return;
    setError('');
    setMessage('');
    try {
      await api.delete(`/clients/${clientId}`);
      setMessage('Cliente excluido com sucesso.');
      await loadData();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Falha ao excluir cliente.');
    }
  };

  return (
    <Layout>
      <div className="page-header">
        <h2>Clientes</h2>
        <p className="muted">Fluxo recomendado: crie o cliente e ja informe o primeiro projeto.</p>
      </div>

      <form className="card inline-form inline-form-project" onSubmit={handleCreate}>
        <div className="form-field">
          <label className="field-label" htmlFor="client-name">
            Nome do cliente
          </label>
          <input
            id="client-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Cliente Alfa"
            required
          />
        </div>
        <div className="form-field">
          <label className="field-label" htmlFor="client-project">
            Projeto inicial (opcional)
          </label>
          <input
            id="client-project"
            value={initialProject}
            onChange={(e) => setInitialProject(e.target.value)}
            placeholder="Ex: P10"
          />
        </div>
        <button type="submit">Criar cliente</button>
        {message && <p className="success">{message}</p>}
        {error && <p className="error">{error}</p>}
      </form>

      <div className="card client-tree">
        {clients.map((client) => {
          const items = projectsByClient.get(client.id) || [];
          return (
            <section key={client.id} className="client-block">
              <header className="client-head">
                <div>
                  <h3>{client.name}</h3>
                  <p className="muted">
                    {items.length} projeto(s) - {client.configs_count ?? 0} configuracao(oes)
                  </p>
                </div>
                {user?.role === 'ADMIN' && (
                  <button
                    type="button"
                    className="danger"
                    onClick={() => handleDeleteClient(client.id)}
                  >
                    Excluir cliente
                  </button>
                )}
              </header>

              {items.length === 0 ? (
                <p className="muted">Sem projetos cadastrados.</p>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Projeto</th>
                        <th>Total Configs</th>
                        <th>Pendentes</th>
                        <th>Aprovadas</th>
                        <th>Reprovadas</th>
                        <th>Abrir</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((project) => (
                        <tr key={project.id}>
                          <td>{project.name}</td>
                          <td>{project.total_configs ?? 0}</td>
                          <td>{project.pending_configs ?? 0}</td>
                          <td>{project.approved_configs ?? 0}</td>
                          <td>{project.rejected_configs ?? 0}</td>
                          <td>
                            <Link className="link-btn" to={`/projects/${project.id}`}>
                              Ver dentro do projeto
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          );
        })}

        {clients.length === 0 && <p className="muted">Nenhum cliente cadastrado.</p>}
      </div>
    </Layout>
  );
}
