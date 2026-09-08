import { useState } from 'react';
import api from '../api/client';

const REPORTS = [
  {
    key: 'members',
    title: 'Membership Report',
    description: 'All members in your scope: code, contacts, org branch and dues category.',
  },
  {
    key: 'contributions',
    title: 'Contributions Report',
    description: 'Per-member dues across every period: expected vs paid, method and receipt.',
  },
  {
    key: 'payments',
    title: 'Payments Report',
    description: 'Every payment: amount, method, status, who recorded/refunded it.',
  },
];

export default function Reports() {
  const [downloading, setDownloading] = useState(null); // `${key}-${format}`
  const [error, setError] = useState('');

  const download = async (key, format) => {
    const tag = `${key}-${format}`;
    setDownloading(tag);
    setError('');
    try {
      const res = await api.get(`/api/reports/${key}`, { params: { format }, responseType: 'blob' });
      const cd = res.headers['content-disposition'] || '';
      const m = cd.match(/filename="?([^";]+)"?/);
      const name = (m && m[1]) || `${key}-report.${format}`;
      const url = window.URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.response?.data?.message || 'Export failed');
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-emerald-900 mb-1">Reports</h1>
      <p className="text-gray-600 mb-6">Export role-scoped membership and financial reports.</p>

      {error && <div className="mb-4 bg-red-50 text-red-600 border border-red-200 rounded-lg px-3 py-2 text-sm">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {REPORTS.map((r) => (
          <div key={r.key} className="bg-white rounded-xl border border-emerald-100 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-emerald-900 uppercase tracking-wide">{r.title}</h2>
            <p className="text-xs text-gray-500 mt-1 mb-4">{r.description}</p>
            <div className="flex gap-2">
              {['csv', 'xlsx', 'pdf'].map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => download(r.key, fmt)}
                  disabled={downloading === `${r.key}-${fmt}`}
                  className="flex-1 px-3 py-1.5 border border-emerald-300 text-emerald-700 hover:bg-emerald-50 disabled:opacity-60 text-xs font-semibold rounded-lg transition uppercase"
                >
                  {downloading === `${r.key}-${fmt}` ? '...' : fmt}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}