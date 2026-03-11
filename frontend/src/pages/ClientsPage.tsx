import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import type { Client, Project } from '../types';
import { isValidIpv4 } from '../utils/network';

type ClientFormState = {
  name: string;
  project_name: string;
  ip: string;
  mask: string;
  gateway: string;
};

const initialFormState: ClientFormState = {
  name: '',
  project_name: '',
  ip: '',
  mask: '',
  gateway: '',
};

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form, setForm] = useState<ClientFormState>(initialFormState);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof ClientFormState, string>>>({});
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

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setFieldErrors({});
  };

  const updateField = (key: keyof ClientFormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => ({ ...prev, [key]: '' }));
  };

  const validateForm = () => {
    const nextErrors: Partial<Record<keyof ClientFormState, string>> = {};

    if (!form.name.trim()) nextErrors.name = 'Cliente obrigatorio.';
    if (!form.ip.trim()) nextErrors.ip = 'IP obrigatorio.';
    if (!form.mask.trim()) nextErrors.mask = 'Mascara obrigatoria.';
    if (!form.gateway.trim()) nextErrors.gateway = 'Gateway obrigatorio.';

    if (form.ip && !isValidIpv4(form.ip)) nextErrors.ip = 'Informe um IPv4 valido.';
    if (form.mask && !isValidIpv4(form.mask)) nextErrors.mask = 'Informe um IPv4 valido.';
    if (form.gateway && !isValidIpv4(form.gateway)) nextErrors.gateway = 'Informe um IPv4 valido.';

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
                  <p className="muted client-network">
                    IP {client.ip} | Mascara {client.mask} | Gateway {client.gateway}
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

              <div className="form-field">
                <label className="field-label" htmlFor="client-project">
                  Projeto (opcional)
                </label>
                <input
                  id="client-project"
                  value={form.project_name}
                  onChange={(e) => updateField('project_name', e.target.value)}
                  placeholder="Ex: P10"
                />
              </div>

              <div className="form-field">
                <label className="field-label" htmlFor="client-ip">
                  IP
                </label>
                <input
                  id="client-ip"
                  value={form.ip}
                  onChange={(e) => updateField('ip', e.target.value)}
                  className={fieldErrors.ip ? 'input-error' : ''}
                  placeholder="Ex: 192.168.0.10"
                  required
                />
                {fieldErrors.ip && <span className="error">{fieldErrors.ip}</span>}
              </div>

              <div className="form-field">
                <label className="field-label" htmlFor="client-mask">
                  Mascara
                </label>
                <input
                  id="client-mask"
                  value={form.mask}
                  onChange={(e) => updateField('mask', e.target.value)}
                  className={fieldErrors.mask ? 'input-error' : ''}
                  placeholder="Ex: 255.255.255.0"
                  required
                />
                {fieldErrors.mask && <span className="error">{fieldErrors.mask}</span>}
              </div>

              <div className="form-field">
                <label className="field-label" htmlFor="client-gateway">
                  Gateway
                </label>
                <input
                  id="client-gateway"
                  value={form.gateway}
                  onChange={(e) => updateField('gateway', e.target.value)}
                  className={fieldErrors.gateway ? 'input-error' : ''}
                  placeholder="Ex: 192.168.0.1"
                  required
                />
                {fieldErrors.gateway && <span className="error">{fieldErrors.gateway}</span>}
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
    </Layout>
  );
}
