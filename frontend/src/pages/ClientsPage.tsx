import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import type { Client, Project } from '../types';

type ClientFormState = {
  name: string;
};

const initialFormState: ClientFormState = {
  name: '',
};

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [form, setForm] = useState<ClientFormState>(initialFormState);
  const [editName, setEditName] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof ClientFormState, string>>>({});
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [editError, setEditError] = useState('');
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

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setFieldErrors({});
  };

  const openEditModal = (client: Client) => {
    setEditingClient(client);
    setEditName(client.name);
    setEditError('');
  };

  const closeEditModal = () => {
    setEditingClient(null);
    setEditName('');
    setEditError('');
  };

  const updateField = (key: keyof ClientFormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => ({ ...prev, [key]: '' }));
  };

  const validateForm = () => {
    const nextErrors: Partial<Record<keyof ClientFormState, string>> = {};

    if (!form.name.trim()) nextErrors.name = 'Cliente obrigatorio.';

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setMessage('');
    if (!validateForm()) return;

    try {
      await api.post('/clients', form);
      setMessage('Cliente criado com sucesso.');
      setForm(initialFormState);
      setFieldErrors({});
      closeCreateModal();
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

  const handleEditClient = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingClient) return;

    setEditError('');
    setError('');
    setMessage('');

    try {
      await api.patch(`/clients/${editingClient.id}`, { name: editName });
      setMessage('Cliente atualizado com sucesso.');
      closeEditModal();
      await loadData();
    } catch (err: any) {
      setEditError(err?.response?.data?.message || 'Falha ao atualizar cliente.');
    }
  };

  return (
    <Layout>
      <div className="page-header">
        <h2>Clientes</h2>
        <div className="page-actions">
          <button type="button" onClick={() => setShowCreateModal(true)}>
            Novo Cliente
          </button>
        </div>
      </div>

      {message && <p className="success">{message}</p>}
      {error && <p className="error">{error}</p>}

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
                  <div className="project-actions">
                    <button type="button" onClick={() => openEditModal(client)}>
                      Editar cliente
                    </button>
                    <button
                      type="button"
                      className="danger"
                      onClick={() => handleDeleteClient(client.id)}
                    >
                      Excluir cliente
                    </button>
                  </div>
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
                        <th>Rede</th>
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
                          <td className="ip-cell">{project.network_range}</td>
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

      {showCreateModal && (
        <Modal title="Novo Cliente" onClose={closeCreateModal}>
          <form className="config-form" onSubmit={handleCreate}>
            <div className="form-grid">
              <div className="form-field">
                <label className="field-label" htmlFor="client-name">
                  Cliente
                </label>
                <input
                  id="client-name"
                  value={form.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  className={fieldErrors.name ? 'input-error' : ''}
                  placeholder="Ex: Cliente Alfa"
                  required
                />
                {fieldErrors.name && <span className="error">{fieldErrors.name}</span>}
              </div>
            </div>

            <div className="modal-actions">
              <button type="submit">Salvar</button>
              <button type="button" className="danger" onClick={closeCreateModal}>
                Cancelar
              </button>
            </div>
          </form>
        </Modal>
      )}

      {editingClient && (
        <Modal title={`Editar ${editingClient.name}`} onClose={closeEditModal}>
          <form className="config-form" onSubmit={handleEditClient}>
            <div className="form-field">
              <label className="field-label" htmlFor="edit-client-name">
                Cliente
              </label>
              <input
                id="edit-client-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
              />
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
