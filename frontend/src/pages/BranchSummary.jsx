import { useEffect, useState } from 'react';
import api from '../api/client';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const naira = (n) => `₦${Number(n).toLocaleString()}`;

function SummaryTable({ title, rows, parents }) {
  return (
    <div className="bg-white rounded-xl border border-emerald-100 shadow-sm overflow-hidden">
      <div className="px-4 py-3 bg-emerald-50 text-emerald-800 text-xs font-semibold uppercase tracking-wide">{title}</div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="text-left text-gray-400 text-xs uppercase tracking-wide">
              {parents.map((p) => (
                <th key={p} className="px-4 py-2.5 font-semibold whitespace-nowrap">{p}</th>
              ))}
              <th className="px-4 py-2.5 font-semibold whitespace-nowrap">Branch</th>
              <th className="px-4 py-2.5 font-semibold text-right whitespace-nowrap">Members</th>
              <th className="px-4 py-2.5 font-semibold text-right whitespace-nowrap">Expected</th>
              <th className="px-4 py-2.5 font-semibold text-right whitespace-nowrap">Paid</th>
              <th className="px-4 py-2.5 font-semibold text-right whitespace-nowrap">Unpaid</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td className="px-4 py-3 text-gray-400" colSpan={4 + parents.length}>No data.</td></tr>
            ) : rows.map((r) => (
              <tr key={r.id} className="border-t border-gray-100">
                {parents.map((p) => <td key={p} className="px-4 py-2.5 text-gray-500 whitespace-nowrap">{r[`${p.toLowerCase().replace(/[^a-z]+/g, '_')}`] || '—'}</td>)}
                <td className="px-4 py-2.5 font-medium text-slate-800 whitespace-nowrap">{r.name}</td>
                <td className="px-4 py-2.5 text-right text-slate-800 font-semibold">{r.members.toLocaleString()}</td>
                <td className="px-4 py-2.5 text-right text-emerald-700 font-semibold">{naira(r.expected)}</td>
                <td className="px-4 py-2.5 text-right text-emerald-700">{r.paid.toLocaleString()}</td>
                <td className="px-4 py-2.5 text-right text-amber-600">{r.unpaid.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function BranchSummary() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/api/branch-summary')
      .then((res) => setData(res.data.data))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load branch summary'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-gray-400">Loading...</p>;
  if (error) return <div className="bg-red-50 text-red-600 border border-red-200 rounded-lg px-3 py-2 text-sm">{error}</div>;
  if (!data) return null;

  return (
    <div>
      <h1 className="text-2xl font-bold text-emerald-900 mb-1">Branch Summary</h1>
      <p className="text-gray-600 mb-6">
        Members, expected, paid and unpaid{data.period ? ` for ${MONTHS[data.period.month - 1]} ${data.period.year}` : ''} — at every level of the hierarchy.
      </p>

      <div className="space-y-6">
        <SummaryTable title="Zones" rows={data.zones} parents={[]} />
        <SummaryTable title="Units" rows={data.units} parents={['Zone']} />
        <SummaryTable title="Sub-Units" rows={data.subUnits} parents={['Zone', 'Unit']} />
      </div>
    </div>
  );
}