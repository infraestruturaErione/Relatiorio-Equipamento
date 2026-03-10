import { useEffect, useMemo, useState } from 'react';
import api from '../api';
import Layout from '../components/Layout';
import Pagination from '../components/Pagination';
import type { EquipmentConfig } from '../types';

export default function PendingPage() {
  const [data, setData] = useState<EquipmentConfig[]>([]);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const load = () => {
    api.get('/configs?status=PENDING').then((response) => {
      setData(response.data as EquipmentConfig[]);
      setPage(1);
    });
  };

  useEffect(() => {
    load();
  }, []);

  const validate = async (id: number) => {
    setError('');
    try {
      await api.patch(`/configs/${id}/validate`, { notes: 'Validado' });
      load();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Falha ao validar.');
    }
  };

  const reject = async (id: number) => {
    setError('');
    try {
      await api.patch(`/configs/${id}/reject`, { notes: 'Reprovado na validacao' });
      load();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Falha ao reprovar.');
    }
  };

  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return data.slice(start, start + pageSize);
  }, [data, page, pageSize]);

  return (
    <Layout>
      <h2>Validacoes Pendentes</h2>
      {error && <p className="error">{error}</p>}
      <div className="table-wrap card">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Client</th>
              <th>Project</th>
              <th>Equipamento</th>
              <th>IP inicial</th>
              <th>IP final</th>
              <th>Configurado por</th>
              <th>Acoes</th>
            </tr>
          </thead>
          <tbody>
            {pagedRows.map((item) => (
              <tr key={item.id}>
                <td>{item.id}</td>
                <td>{item.client_name || '-'}</td>
                <td>{item.project_name || '-'}</td>
                <td>{item.equipment}</td>
                <td className="ip-cell">{item.ip_start || '-'}</td>
                <td className="ip-cell">{item.ip_end || '-'}</td>
                <td>{item.configured_by_name}</td>
                <td className="actions-cell">
                  <button onClick={() => validate(item.id)} type="button">Aprovar</button>
                  <button className="danger" onClick={() => reject(item.id)} type="button">Reprovar</button>
                </td>
              </tr>
            ))}
            {pagedRows.length === 0 && (
              <tr>
                <td colSpan={8} className="empty-row">
                  Nenhuma validacao pendente.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination
        page={page}
        pageSize={pageSize}
        total={data.length}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
    </Layout>
  );
}
