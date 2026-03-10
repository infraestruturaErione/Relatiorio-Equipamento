import { useEffect, useState } from 'react';
import api from '../api';
import Layout from '../components/Layout';
import StatusBadge from '../components/StatusBadge';
import type { EquipmentConfig } from '../types';

export default function HistoryPage() {
  const [data, setData] = useState<EquipmentConfig[]>([]);

  useEffect(() => {
    api.get('/configs').then((response) => setData(response.data as EquipmentConfig[]));
  }, []);

  return (
    <Layout>
      <h2>Historico</h2>
      <div className="table-wrap card">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Equipamento</th>
              <th>Status</th>
              <th>Configurado por</th>
              <th>Validado por</th>
              <th>Observacoes</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr key={item.id}>
                <td>{item.id}</td>
                <td>{item.equipment}</td>
                <td><StatusBadge status={item.status} /></td>
                <td>{item.configured_by_name}</td>
                <td>{item.validated_by_name || '-'}</td>
                <td>{item.notes || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}
