import { useEffect, useState } from 'react';
import api from '../api/client';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function ManagePeriods() {
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const today = new Date();
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');

  const loadPeriods = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/api/contribution-periods');
      setPeriods(res.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load contribution periods');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPeriods();
  }, []);

  const handleOpen = async (e) => {
    e.preventDefault();
    setFormError('');
    setNotice('');
    setSaving(true);
    try {
      const res = await api.post('/api/contribution-periods', { month: Number(month), year: Number(year) });
      setNotice(res.data.message || `Opened period for ${MONTHS[month - 1]} ${year}`);
      await loadPeriods();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to open contribution period');
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500';

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h1 className="text-2xl font-bold text-emerald-900">Contribution Periods</h1>
      </div>

      {/* Open a period form (Central) */}
      <div className="bg-white rounded-xl border border-emerald-100 shadow-sm p-5 mb-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-1">Open a New Period</h2>
        <p className="text-sm text-gray-500 mb-4">
          This creates an UNPAID contribution for every active member, snapshotted from their current category amount.
        </p>
        {formError && (
          <div className="mb-4 bg-red-50 text-red-600 border border-red-200 rounded-lg px-3 py-2 text-sm">{formError}</div>
        )}
        {notice && (
          <div className="mb-4 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg px-3 py-2 text-sm">{notice}</div>
        )}
        <form onSubmit={handleOpen} className="flex flex-col sm:flex-row gap-3">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Month</label>
            <select className={inputCls} value={month} onChange={(e) => setMonth(Number(e.target.value))}>
              {MONTHS.map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Year</label>
            <input type="number" className={inputCls} value={year} min="2000" max="3000" onChange={(e) => setYear(e.target.value)} />
          </div>
          <div className="flex items-end">
            <button type="submit" disabled={saving} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-semibold rounded-lg transition">
              {saving ? 'Opening...' : 'Open Period'}
            </button>
          </div>
        </form>
      </div>

      {/* Periods list */}
      {error && <div className="bg-red-50 text-red-600 border border-red-200 rounded-lg px-3 py-2 text-sm mb-4">{error}</div>}

      {loading ? (
        <p className="text-gray-400">Loading...</p>
      ) : periods.length === 0 ? (
        <p className="text-gray-400">No contribution periods opened yet.</p>
      ) : (
        <div className="bg-white rounded-xl border border-emerald-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[400px]">
              <thead>
                <tr className="bg-emerald-50 text-emerald-700 text-left">
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Period</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Status</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Opened At</th>
                </tr>
              </thead>
              <tbody>
                {periods.map((p) => (
                  <tr key={p.id} className="border-t border-gray-100">
                    <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">{MONTHS[p.month - 1]} {p.year}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${p.status === 'OPEN' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{new Date(p.created_at).toLocaleString()}</td>
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
