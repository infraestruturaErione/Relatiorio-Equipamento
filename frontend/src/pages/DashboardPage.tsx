import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import Layout from '../components/Layout';
import type { DashboardData, GlobalSearchResult } from '../types';

const emptyDashboard: DashboardData = {
  summary: { total: 0, pending: 0, approved: 0, rejected: 0 },
  recent_projects: [],
  pending_by_analyst: [],
  top_clients: [],
};

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState<DashboardData>(emptyDashboard);
  const [query, setQuery] = useState('');
  const [searchResult, setSearchResult] = useState<GlobalSearchResult>({
    clients: [],
    projects: [],
    configs: [],
  });

  useEffect(() => {
    api.get('/configs/dashboard').then((response) => setDashboard(response.data as DashboardData));
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSearchResult({ clients: [], projects: [], configs: [] });
      return;
    }

    const timeoutId = window.setTimeout(() => {
      api.get('/search/global', { params: { q: trimmed } }).then((response) => {
        setSearchResult(response.data as GlobalSearchResult);
      });
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [query]);

  return (
    <Layout>
      <div className="page-header">
        <h2>Dashboard</h2>
        <p className="muted">Resumo operacional, busca global e atalhos rapidos.</p>
      </div>

      <div className="info-banner">
        Regra ativa: quem configura nao pode validar ou reprovar o mesmo equipamento.
      </div>

      <div className="page-actions">
        <Link className="link-btn" to="/pending">Pendencias</Link>
        <Link className="link-btn" to="/history">Historico</Link>
        <Link className="link-btn" to="/reports">Relatorios</Link>
        <Link className="link-btn" to="/new">Nova Config</Link>
      </div>

      <div className="card config-form">
        <div className="form-field">
          <label className="field-label" htmlFor="global-search">
            Busca global
          </label>
          <input
            id="global-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar cliente, projeto, IP, VLAN, equipamento ou servico"
          />
        </div>

        {query.trim().length >= 2 && (
          <div className="details-grid">
            <div className="card">
              <h3>Clientes</h3>
              {searchResult.clients.length === 0 ? (
                <p className="muted">Nenhum cliente encontrado.</p>
              ) : (
                <div className="search-list">
                  {searchResult.clients.map((client) => (
                    <span key={client.id}>{client.name}</span>
                  ))}
                </div>
              )}
            </div>
            <div className="card">
              <h3>Projetos</h3>
              {searchResult.projects.length === 0 ? (
                <p className="muted">Nenhum projeto encontrado.</p>
              ) : (
                <div className="search-list">
                  {searchResult.projects.map((project) => (
                    <Link key={project.id} to={`/projects/${project.id}`}>
                      {project.client_name} / {project.name} ({project.network_range})
                    </Link>
                  ))}
                </div>
              )}
            </div>
            <div className="card details-notes">
              <h3>Configuracoes</h3>
              {searchResult.configs.length === 0 ? (
                <p className="muted">Nenhuma configuracao encontrada.</p>
              ) : (
                <div className="search-list">
                  {searchResult.configs.map((config) => (
                    <Link key={config.id} to={`/configs/${config.id}`}>
                      #{config.id} {config.client_name || '-'} / {config.project_name || '-'} / {config.equipment} / {config.ip || '-'} / VLAN {config.vlan}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="grid">
        <div className="card stat stat-pending">
          <h3>Configs Pendentes</h3>
          <strong>{dashboard.summary.pending}</strong>
          <p className="muted">Aguardando analista validador</p>
        </div>
        <div className="card stat stat-approved">
          <h3>Configs Aprovadas</h3>
          <strong>{dashboard.summary.approved}</strong>
          <p className="muted">Configuracoes aprovadas</p>
        </div>
        <div className="card stat stat-rejected">
          <h3>Configs Reprovadas</h3>
          <strong>{dashboard.summary.rejected}</strong>
          <p className="muted">Configuracoes reprovadas</p>
        </div>
        <div className="card stat stat-total">
          <h3>Total de Configs</h3>
          <strong>{dashboard.summary.total}</strong>
          <p className="muted">Visao geral do ambiente</p>
        </div>
      </div>

      <div className="details-grid">
        <div className="card">
          <h3>Ultimos Projetos Alterados</h3>
          <div className="search-list">
            {dashboard.recent_projects.map((project) => (
              <Link key={project.id} to={`/projects/${project.id}`}>
                {project.client_name} / {project.name} / {project.pending_configs} pendente(s)
              </Link>
            ))}
            {dashboard.recent_projects.length === 0 && (
              <p className="muted">Nenhum projeto encontrado.</p>
            )}
          </div>
        </div>

        <div className="card">
          <h3>Pendencias por Analista</h3>
          <div className="search-list">
            {dashboard.pending_by_analyst.map((analyst) => (
              <span key={analyst.id}>{analyst.name}: {analyst.pending_count}</span>
            ))}
            {dashboard.pending_by_analyst.length === 0 && (
              <p className="muted">Sem pendencias em aberto.</p>
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <h3>Clientes com mais volume</h3>
        <div className="search-list">
          {dashboard.top_clients.map((client) => (
            <span key={client.id}>
              {client.name}: {client.total_configs} config(s), {client.pending_configs} pendente(s)
            </span>
          ))}
          {dashboard.top_clients.length === 0 && (
            <p className="muted">Nenhum cliente com dados ainda.</p>
          )}
        </div>
      </div>
    </Layout>
  );
}
