import { useState } from 'react';
import api from '../api';
import Layout from '../components/Layout';

type FormState = {
  equipment: string;
  ip: string;
  mask: string;
  gateway: string;
  vlan: string;
  service: string;
  mac: string;
  username: string;
  password: string;
  notes: string;
};

const initialState: FormState = {
  equipment: '',
  ip: '',
  mask: '',
  gateway: '',
  vlan: '',
  service: '',
  mac: '',
  username: '',
  password: '',
  notes: '',
};

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
  const [form, setForm] = useState<FormState>(initialState);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const onChange = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');
    setError('');

    try {
      await api.post('/configs', form);
      setMessage('Configuracao cadastrada com sucesso.');
      setForm(initialState);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Falha ao salvar configuracao.');
    }
  };

  return (
    <Layout>
      <div className="page-header">
        <h2>Nova Configuracao</h2>
        <p className="muted">Preencha os campos obrigatorios para registrar o equipamento.</p>
      </div>

      <form className="card config-form" onSubmit={onSubmit}>
        <section className="form-section">
          <h3>Dados de Rede</h3>
          <div className="form-grid">
            <Field id="equipment" label="Equipamento" required>
              <input
                id="equipment-input"
                placeholder="Ex: PDU-RACK-01"
                value={form.equipment}
                onChange={(e) => onChange('equipment', e.target.value)}
                required
              />
            </Field>

            <Field id="ip" label="IP" required>
              <input
                id="ip-input"
                placeholder="Ex: 192.168.0.10"
                value={form.ip}
                onChange={(e) => onChange('ip', e.target.value)}
                required
                pattern="^\d{1,3}(\.\d{1,3}){3}$"
                title="Use formato IPv4, ex: 192.168.0.10"
              />
            </Field>

            <Field id="mask" label="Mask" required>
              <input
                id="mask-input"
                placeholder="Ex: 255.255.255.0"
                value={form.mask}
                onChange={(e) => onChange('mask', e.target.value)}
                required
              />
            </Field>

            <Field id="gateway" label="Gateway" required>
              <input
                id="gateway-input"
                placeholder="Ex: 192.168.0.1"
                value={form.gateway}
                onChange={(e) => onChange('gateway', e.target.value)}
                required
              />
            </Field>

            <Field id="vlan" label="VLAN" required>
              <input
                id="vlan-input"
                placeholder="Ex: 120"
                value={form.vlan}
                onChange={(e) => onChange('vlan', e.target.value)}
                required
              />
            </Field>

            <Field id="service" label="Service" required>
              <input
                id="service-input"
                placeholder="Ex: monitoramento"
                value={form.service}
                onChange={(e) => onChange('service', e.target.value)}
                required
              />
            </Field>
          </div>
        </section>

        <section className="form-section">
          <h3>Acesso ao Equipamento</h3>
          <div className="form-grid">
            <Field id="mac" label="MAC" required>
              <input
                id="mac-input"
                placeholder="Ex: AA:BB:CC:DD:EE:FF"
                value={form.mac}
                onChange={(e) => onChange('mac', e.target.value.toUpperCase())}
                required
              />
            </Field>

            <Field id="username" label="Username" required>
              <input
                id="username-input"
                placeholder="Usuario do equipamento"
                value={form.username}
                onChange={(e) => onChange('username', e.target.value)}
                required
              />
            </Field>

            <Field id="password" label="Password" required>
              <input
                id="password-input"
                placeholder="Senha do equipamento"
                value={form.password}
                onChange={(e) => onChange('password', e.target.value)}
                type="password"
                required
              />
            </Field>

            <Field id="notes" label="Observacoes">
              <textarea
                id="notes-input"
                placeholder="Detalhes adicionais (opcional)"
                value={form.notes}
                onChange={(e) => onChange('notes', e.target.value)}
                rows={3}
              />
            </Field>
          </div>
        </section>

        <div className="form-footer">
          <span className="muted">Campos com * sao obrigatorios.</span>
          <button type="submit">Salvar configuracao</button>
        </div>

        {message && <p className="success">{message}</p>}
        {error && <p className="error">{error}</p>}
      </form>
    </Layout>
  );
}
