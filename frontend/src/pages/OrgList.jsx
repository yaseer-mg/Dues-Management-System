import { useEffect, useState } from 'react';
import api from '../api/client';

export default function OrgList({ title, endpoint }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(endpoint)
      .then((res) => setItems(res.data.data || []))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load'))
      .finally(() => setLoading(false));
  }, [endpoint]);

  if (loading)
    return (
      <div>
        <h1 className="text-2xl font-bold text-emerald-900 mb-4">{title}</h1>
        <p className="text-gray-400">Loading...</p>
      </div>
    );

  if (error)
    return (
      <div>
        <h1 className="text-2xl font-bold text-emerald-900 mb-4">{title}</h1>
        <div className="bg-red-50 text-red-600 border border-red-200 rounded-lg px-3 py-2 text-sm">{error}</div>
      </div>
    );

  return (
    <div>
      <h1 className="text-2xl font-bold text-emerald-900 mb-4">{title}</h1>
      {items.length === 0 ? (
        <p className="text-gray-400">No records yet.</p>
      ) : (
        <div className="bg-white rounded-xl border border-emerald-100 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[400px]">
              <thead>
                <tr className="bg-emerald-50 text-emerald-700 text-left">
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Name</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Serial</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-t border-gray-100">
                    <td className="px-4 py-3 text-gray-800 whitespace-nowrap">{item.name}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{item.serial_number}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                          item.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}