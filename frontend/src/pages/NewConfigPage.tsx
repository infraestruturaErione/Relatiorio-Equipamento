import { useEffect, useMemo, useState } from 'react';
import api from '../api';
import Layout from '../components/Layout';
import type { Client, Project } from '../types';

type ContextState = {
  client_id: string;
  project_id: string;
};

type DeviceState = {
  equipment: string;
  ip_start: string;
  ip_end: string;
  mask: string;
  gateway: string;
  vlan: string;
  service: string;
  mac: string;
  username: string;
  password: string;
  notes: string;
};

const initialContext: ContextState = {
  client_id: '',
  project_id: '',
};

const createEmptyDevice = (): DeviceState => ({
  equipment: '',
  ip_start: '',
  ip_end: '',
  mask: '',
  gateway: '',
  vlan: '',
  service: '',
  mac: '',
  username: '',
  password: '',
  notes: '',
});

function Field({
  id,
  label,
  required,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="form-field" id={id}>
      <label className="field-label" htmlFor={`${id}-input`}>
        {label}
        {required ? <span className="required">*</span> : <span className="optional">(opcional)</span>}
      </label>
      {children}
    </div>
  );
}

export default function NewConfigPage() {
  const [context, setContext] = useState<ContextState>(initialContext);
  const [devices, setDevices] = useState<DeviceState[]>([createEmptyDevice()]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([api.get('/clients'), api.get('/projects')]).then(([clientsRes, projectsRes]) => {
      setClients(clientsRes.data as Client[]);
      setProjects(projectsRes.data as Project[]);
    });
  }, []);

  const projectOptions = useMemo(
    () => projects.filter((project) => String(project.client_id) === context.client_id),
    [projects, context.client_id]
  );

  const onContextChange = (key: keyof ContextState, value: string) => {
    setContext((prev) => {
      if (key === 'client_id') {
        return { ...prev, client_id: value, project_id: '' };
      }
      return { ...prev, [key]: value };
    });
  };

  const onDeviceChange = (index: number, key: keyof DeviceState, value: string) => {
    setDevices((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        [key]: key === 'mac' ? value.toUpperCase() : value,
      };
      return next;
    });
  };

  const addDevice = () => {
    setDevices((prev) => [...prev, createEmptyDevice()]);
  };

  const removeDevice = (index: number) => {
    setDevices((prev) => {
      if (prev.length === 1) return prev;
      return prev.filter((_, currentIndex) => currentIndex !== index);
    });
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');
    setError('');
    setSaving(true);

    try {
      for (const device of devices) {
        await api.post('/configs', {
          ...device,
          client_id: Number(context.client_id),
          project_id: Number(context.project_id),
        });
      }
      setMessage(`${devices.length} configuracao(oes) cadastrada(s) com sucesso.`);
      setContext(initialContext);
      setDevices([createEmptyDevice()]);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Falha ao salvar configuracoes.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <div className="page-header">
        <h2>Nova Config</h2>
        <p className="muted">Use o botao + para incluir varios equipamentos no mesmo envio.</p>
      </div>

      <form className="card config-form" onSubmit={onSubmit}>
        <section className="form-section">
          <h3>Contexto do Projeto</h3>
          <div className="form-grid">
            <Field id="client" label="Cliente" required>
              <select
                id="client-input"
                value={context.client_id}
                onChange={(e) => onContextChange('client_id', e.target.value)}
                required
              >
                <option value="">Selecione</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field id="project" label="Projeto" required>
              <select
                id="project-input"
                value={context.project_id}
                onChange={(e) => onContextChange('project_id', e.target.value)}
                required
                disabled={!context.client_id}
              >
                <option value="">Selecione</option>
                {projectOptions.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </section>

        <section className="form-section">
          <div className="section-head">
            <h3>Equipamentos</h3>
            <button type="button" className="link-btn" onClick={addDevice}>
              + Adicionar equipamento
            </button>
          </div>

          <div className="device-list">
            {devices.map((device, index) => (
              <article key={`device-${index}`} className="device-card">
                <div className="device-card-head">
                  <h4>Equipamento {index + 1}</h4>
                  <button
                    type="button"
                    className="danger"
                    onClick={() => removeDevice(index)}
                    disabled={devices.length === 1}
                  >
                    Remover
                  </button>
                </div>

                <div className="form-grid">
                  <Field id={`equipment-${index}`} label="Equipamento" required>
                    <input
                      id={`equipment-${index}-input`}
                      placeholder="Ex: PDU-RACK-01"
                      value={device.equipment}
                      onChange={(e) => onDeviceChange(index, 'equipment', e.target.value)}
                      required
                    />
                  </Field>

                  <Field id={`ip-start-${index}`} label="IP inicial" required>
                    <input
                      id={`ip-start-${index}-input`}
                      placeholder="Ex: 192.168.0.10"
                      value={device.ip_start}
                      onChange={(e) => onDeviceChange(index, 'ip_start', e.target.value)}
                      required
                      pattern="^\d{1,3}(\.\d{1,3}){3}$"
                    />
                  </Field>

                  <Field id={`ip-end-${index}`} label="IP final" required>
                    <input
                      id={`ip-end-${index}-input`}
                      placeholder="Ex: 192.168.0.120"
                      value={device.ip_end}
                      onChange={(e) => onDeviceChange(index, 'ip_end', e.target.value)}
                      required
                      pattern="^\d{1,3}(\.\d{1,3}){3}$"
                    />
                  </Field>

                  <Field id={`mask-${index}`} label="Mask" required>
                    <input
                      id={`mask-${index}-input`}
                      placeholder="Ex: 255.255.255.0"
                      value={device.mask}
                      onChange={(e) => onDeviceChange(index, 'mask', e.target.value)}
                      required
                    />
                  </Field>

                  <Field id={`gateway-${index}`} label="Gateway" required>
                    <input
                      id={`gateway-${index}-input`}
                      placeholder="Ex: 192.168.0.1"
                      value={device.gateway}
                      onChange={(e) => onDeviceChange(index, 'gateway', e.target.value)}
                      required
                    />
                  </Field>

                  <Field id={`vlan-${index}`} label="VLAN" required>
                    <input
                      id={`vlan-${index}-input`}
                      placeholder="Ex: 120"
                      value={device.vlan}
                      onChange={(e) => onDeviceChange(index, 'vlan', e.target.value)}
                      required
                    />
                  </Field>

                  <Field id={`service-${index}`} label="Service" required>
                    <input
                      id={`service-${index}-input`}
                      placeholder="Ex: monitoramento"
                      value={device.service}
                      onChange={(e) => onDeviceChange(index, 'service', e.target.value)}
                      required
                    />
                  </Field>

                  <Field id={`mac-${index}`} label="MAC" required>
                    <input
                      id={`mac-${index}-input`}
                      placeholder="Ex: AA:BB:CC:DD:EE:FF"
                      value={device.mac}
                      onChange={(e) => onDeviceChange(index, 'mac', e.target.value)}
                      required
                    />
                  </Field>

                  <Field id={`username-${index}`} label="Username" required>
                    <input
                      id={`username-${index}-input`}
                      placeholder="Usuario do equipamento"
                      value={device.username}
                      onChange={(e) => onDeviceChange(index, 'username', e.target.value)}
                      required
                    />
                  </Field>

                  <Field id={`password-${index}`} label="Password" required>
                    <input
                      id={`password-${index}-input`}
                      placeholder="Senha do equipamento"
                      value={device.password}
                      onChange={(e) => onDeviceChange(index, 'password', e.target.value)}
                      type="password"
                      required
                    />
                  </Field>

                  <Field id={`notes-${index}`} label="Observacoes">
                    <textarea
                      id={`notes-${index}-input`}
                      placeholder="Detalhes adicionais (opcional)"
                      value={device.notes}
                      onChange={(e) => onDeviceChange(index, 'notes', e.target.value)}
                      rows={3}
                    />
                  </Field>
                </div>
              </article>
            ))}
          </div>
        </section>

        <div className="form-footer">
          <span className="muted">Campos com * sao obrigatorios.</span>
          <button type="submit" disabled={saving}>
            {saving ? 'Salvando...' : `Salvar ${devices.length} configuracao(oes)`}
          </button>
        </div>

        {message && <p className="success">{message}</p>}
        {error && <p className="error">{error}</p>}
      </form>
    </Layout>
  );
}
