import { useEffect, useState } from 'react';
import api from '../api';
import Layout from '../components/Layout';
import StatusBadge from '../components/StatusBadge';
import type { EquipmentConfig } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

function downloadBlob(blob: Blob, fileName: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  window.URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const [equipment, setEquipment] = useState('');
  const [ip, setIp] = useState('');
  const [rows, setRows] = useState<EquipmentConfig[]>([]);
  const [selected, setSelected] = useState<EquipmentConfig | null>(null);

  const load = async () => {
    const params: Record<string, string> = {};
    if (equipment) params.equipment = equipment;
    if (ip) params.ip = ip;
    const response = await api.get('/configs', { params });
    setRows(response.data as EquipmentConfig[]);
  };

  useEffect(() => {
    load();
  }, []);

  const exportExcel = async () => {
    const params: Record<string, string> = {};
    if (equipment) params.equipment = equipment;
    if (ip) params.ip = ip;
    const response = await api.get(`${API_URL}/configs/export/excel`, {
      params,
      responseType: 'blob',
    });
    downloadBlob(response.data as Blob, 'configs-filtradas-equipment.xlsx');
  };

  const exportPdf = async () => {
    const params: Record<string, string> = {};
    if (equipment) params.equipment = equipment;
    if (ip) params.ip = ip;
    const response = await api.get(`${API_URL}/configs/export/pdf`, {
      params,
      responseType: 'blob',
    });
    downloadBlob(response.data as Blob, 'relatorio-filtrado-equipment.pdf');
  };

  return (
    <Layout>
      <div className="page-header">
        <h2>Relatorios</h2>
        <p className="muted">Consulta e exportacao com busca por equipamento.</p>
      </div>

      <div className="info-banner">
        Regra de validacao: o mesmo analista que configurou nao pode validar/reprovar.
      </div>

      <div className="card filters filters-advanced">
        <div className="form-field">
          <label className="field-label" htmlFor="equipment-search">
            Equipamento
          </label>
          <input
            id="equipment-search"
            value={equipment}
            onChange={(e) => setEquipment(e.target.value)}
            placeholder="Ex: PDU-RACK-01"
          />
        </div>
        <div className="form-field">
          <label className="field-label" htmlFor="ip-search">
            IP
          </label>
          <input
            id="ip-search"
            value={ip}
            onChange={(e) => setIp(e.target.value)}
            placeholder="Ex: 192.168.0.10"
          />
        </div>

        <button type="button" onClick={load}>Buscar</button>
        <button type="button" onClick={exportExcel}>Exportar Excel</button>
        <button type="button" onClick={exportPdf}>Exportar PDF</button>
      </div>

      <div className="table-wrap card">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Equipamento</th>
              <th>Service</th>
              <th>IP</th>
              <th>Status</th>
              <th>Configurado por</th>
              <th>Validado por</th>
              <th>Detalhes</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.id}>
                <td>{item.id}</td>
                <td>{item.equipment}</td>
                <td>{item.service}</td>
                <td className="ip-cell">{item.ip}</td>
                <td><StatusBadge status={item.status} /></td>
                <td>{item.configured_by_name}</td>
                <td>{item.validated_by_name || '-'}</td>
                <td>
                  <button type="button" className="icon-btn" onClick={() => setSelected(item)} title="Ver detalhes">
                    Ver
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="empty-row">
                  Nenhum registro encontrado para o filtro atual.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal-card card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>Configuracao #{selected.id}</h3>
              <button type="button" onClick={() => setSelected(null)}>Fechar</button>
            </div>
            <div className="details-grid">
              <div><strong>Equipamento:</strong> {selected.equipment}</div>
              <div><strong>IP:</strong> <span className="ip-cell">{selected.ip}</span></div>
              <div><strong>Mask:</strong> {selected.mask}</div>
              <div><strong>Gateway:</strong> {selected.gateway}</div>
              <div><strong>VLAN:</strong> {selected.vlan}</div>
              <div><strong>Service:</strong> {selected.service}</div>
              <div><strong>MAC:</strong> {selected.mac}</div>
              <div><strong>Username:</strong> {selected.username}</div>
              <div><strong>Password:</strong> <code>{selected.password}</code></div>
              <div><strong>Status:</strong> <StatusBadge status={selected.status} /></div>
              <div><strong>Configurado por:</strong> {selected.configured_by_name}</div>
              <div><strong>Validado por:</strong> {selected.validated_by_name || '-'}</div>
              <div><strong>Criado em:</strong> {new Date(selected.created_at).toLocaleString()}</div>
              <div><strong>Validado em:</strong> {selected.validated_at ? new Date(selected.validated_at).toLocaleString() : '-'}</div>
              <div className="details-notes"><strong>Observacoes:</strong> {selected.notes || '-'}</div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
