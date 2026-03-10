import { useEffect, useState } from 'react';
import api from '../api';
import Layout from '../components/Layout';
import type { Summary } from '../types';

export default function DashboardPage() {
  const [summary, setSummary] = useState<Summary>({ total: 0, pending: 0, approved: 0, rejected: 0 });

  useEffect(() => {
    api.get('/configs/summary').then((response) => setSummary(response.data as Summary));
  }, []);

  return (
    <Layout>
      <h2>Dashboard</h2>
      <div className="info-banner">
        Regra ativa: quem configura nao pode validar ou reprovar o mesmo equipamento.
      </div>
      <div className="grid">
        <div className="card stat stat-pending">
          <h3>Configs Pendentes</h3>
          <strong>{summary.pending}</strong>
          <p className="muted">Aguardando analista validador</p>
        </div>
        <div className="card stat stat-approved">
          <h3>Configs Aprovadas</h3>
          <strong>{summary.approved}</strong>
          <p className="muted">Configuracoes aprovadas</p>
        </div>
        <div className="card stat stat-rejected">
          <h3>Configs Reprovadas</h3>
          <strong>{summary.rejected}</strong>
          <p className="muted">Configuracoes reprovadas</p>
        </div>
        <div className="card stat stat-total">
          <h3>Total de Configs</h3>
          <strong>{summary.total}</strong>
          <p className="muted">Visao geral do ambiente</p>
        </div>
      </div>
    </Layout>
  );
}
