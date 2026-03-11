import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api';
import Layout from '../components/Layout';
import MaskedText from '../components/MaskedText';
import StatusBadge from '../components/StatusBadge';
import type { EquipmentConfig } from '../types';

export default function ConfigDetailsPage() {
  const { id } = useParams();
  const [config, setConfig] = useState<EquipmentConfig | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) {
      setError('ID invalido.');
      return;
    }

    api
      .get(`/configs/${id}`)
      .then((response) => setConfig(response.data as EquipmentConfig))
      .catch((err) => setError(err?.response?.data?.message || 'Falha ao carregar configuracao.'));
  }, [id]);

  return (
    <Layout>
      <div className="page-header">
        <h2>Detalhes da Configuracao #{id}</h2>
        <p className="muted">Tela aberta por link direto ou QR code do relatorio.</p>
      </div>

      <div className="card">
        <Link to="/history">Voltar para Historico</Link>
      </div>

      {error && <p className="error">{error}</p>}

      {config && (
        <div className="card details-grid">
          <div><strong>Client:</strong> {config.client_name || '-'}</div>
          <div><strong>Project:</strong> {config.project_name || '-'}</div>
          <div><strong>Equipamento:</strong> {config.equipment}</div>
          <div><strong>IP:</strong> <span className="ip-cell">{config.ip || '-'}</span></div>
          <div><strong>Mask:</strong> {config.mask}</div>
          <div><strong>Gateway:</strong> {config.gateway}</div>
          <div><strong>VLAN:</strong> {config.vlan}</div>
          <div><strong>Service:</strong> {config.service}</div>
          <div><strong>MAC:</strong> {config.mac}</div>
          <div><strong>Username:</strong> {config.username}</div>
          <div><strong>Password:</strong> <MaskedText value={config.password} /></div>
          <div><strong>Status:</strong> <StatusBadge status={config.status} /></div>
          <div><strong>Configurado por:</strong> {config.configured_by_name}</div>
          <div><strong>Validado por:</strong> {config.validated_by_name || '-'}</div>
          <div><strong>Criado em:</strong> {new Date(config.created_at).toLocaleString()}</div>
          <div><strong>Validado em:</strong> {config.validated_at ? new Date(config.validated_at).toLocaleString() : '-'}</div>
          <div className="details-notes"><strong>Observacoes:</strong> {config.notes || '-'}</div>
        </div>
      )}
    </Layout>
  );
}
