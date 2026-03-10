import { useEffect, useState } from 'react';
import api from '../api';
import Layout from '../components/Layout';
import type { EquipmentConfig } from '../types';

export default function PendingPage() {
  const [data, setData] = useState<EquipmentConfig[]>([]);
  const [error, setError] = useState('');

  const load = () => {
    api.get('/configs?status=PENDING').then((response) => setData(response.data as EquipmentConfig[]));
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

  return (
    <Layout>
      <h2>Validacoes Pendentes</h2>
      {error && <p className="error">{error}</p>}
      <div className="table-wrap card">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Equipamento</th>
              <th>IP</th>
              <th>Configurado por</th>
              <th>Acoes</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr key={item.id}>
                <td>{item.id}</td>
                <td>{item.equipment}</td>
                <td className="ip-cell">{item.ip}</td>
                <td>{item.configured_by_name}</td>
                <td className="actions-cell">
                  <button onClick={() => validate(item.id)} type="button">Aprovar</button>
                  <button className="danger" onClick={() => reject(item.id)} type="button">Reprovar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}
