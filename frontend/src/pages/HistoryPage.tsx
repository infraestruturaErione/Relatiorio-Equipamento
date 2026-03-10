import { useEffect, useMemo, useState } from 'react';
import api from '../api';
import Layout from '../components/Layout';
import Pagination from '../components/Pagination';
import StatusBadge from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import type { EquipmentConfig } from '../types';

export default function HistoryPage() {
  const [data, setData] = useState<EquipmentConfig[]>([]);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const { user } = useAuth();

  const load = () => {
    api.get('/configs').then((response) => {
      setData(response.data as EquipmentConfig[]);
      setPage(1);
    });
  };

  useEffect(() => {
    load();
  }, []);

  const handleDeleteConfig = async (id: number) => {
    const confirmed = window.confirm('Deseja realmente excluir esta configuracao?');
    if (!confirmed) return;
    setError('');
    try {
      await api.delete(`/configs/${id}`);
      load();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Falha ao excluir configuracao.');
    }
  };

  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return data.slice(start, start + pageSize);
  }, [data, page, pageSize]);

  return (
    <Layout>
      <h2>Historico</h2>
      {error && <p className="error">{error}</p>}
      <div className="table-wrap card">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Client</th>
              <th>Project</th>
              <th>Equipamento</th>
              <th>Status</th>
              <th>Configurado por</th>
              <th>Validado por</th>
              <th>Observacoes</th>
              {user?.role === 'ADMIN' && <th>Acoes</th>}
            </tr>
          </thead>
          <tbody>
            {pagedRows.map((item) => (
              <tr key={item.id}>
                <td>{item.id}</td>
                <td>{item.client_name || '-'}</td>
                <td>{item.project_name || '-'}</td>
                <td>{item.equipment}</td>
                <td><StatusBadge status={item.status} /></td>
                <td>{item.configured_by_name}</td>
                <td>{item.validated_by_name || '-'}</td>
                <td>{item.notes || '-'}</td>
                {user?.role === 'ADMIN' && (
                  <td>
                    <button
                      type="button"
                      className="danger"
                      onClick={() => handleDeleteConfig(item.id)}
                    >
                      Excluir
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {pagedRows.length === 0 && (
              <tr>
                <td colSpan={user?.role === 'ADMIN' ? 9 : 8} className="empty-row">
                  Nenhum historico encontrado.
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
