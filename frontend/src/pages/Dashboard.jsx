import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const naira = (n) => `₦${Number(n).toLocaleString()}`;

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/api/dashboard/stats');
      setData(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (data === null) reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <p className="text-gray-400">Loading...</p>;
  if (error) return <div className="bg-red-50 text-red-600 border border-red-200 rounded-lg px-3 py-2 text-sm">{error}</div>;
  if (!data) return null;

  const { totals, byMethod, breakdown, recentPayments, periodSummary } = data;
  const showQuickCollect = user?.role === 'Collector';

  const statCards = [
    { label: 'Members', value: totals.members.toLocaleString(), accent: 'text-emerald-700' },
    { label: 'Collected', value: naira(totals.collected), accent: 'text-emerald-700' },
    { label: 'Outstanding', value: naira(totals.outstanding), accent: 'text-amber-600' },
    { label: 'Paid Payments', value: totals.paidPayments.toLocaleString(), accent: 'text-slate-800' },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-emerald-900">Dashboard</h1>
          <p className="text-gray-600 mt-0.5">
            Welcome back, <span className="font-semibold text-emerald-800">{user?.name}</span> ({user?.role})
          </p>
        </div>
        {showQuickCollect && (
          <Link to="/collect" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition">
            Collect Cash
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map((c) => (
          <div key={c.label} className="bg-white rounded-xl border border-emerald-100 shadow-sm p-5">
            <div className="text-xs uppercase tracking-wide text-gray-400">{c.label}</div>
            <div className={`text-2xl font-bold mt-1 ${c.accent}`}>{c.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* By method */}
        <div className="bg-white rounded-xl border border-emerald-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-emerald-900 uppercase tracking-wide mb-3">By Payment Method</h2>
          {byMethod.length === 0 ? (
            <p className="text-gray-400 text-sm">No successful payments yet.</p>
          ) : (
            <div className="space-y-2">
              {byMethod.map((m) => (
                <div key={m.method} className="flex items-center justify-between text-sm">
                  <span className="text-slate-700 font-medium">{m.method}</span>
                  <span className="text-gray-500">{m.count} payment{m.count === 1 ? '' : 's'}</span>
                  <span className="font-semibold text-emerald-700">{naira(m.total)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Breakdown */}
        <div className="bg-white rounded-xl border border-emerald-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-emerald-900 uppercase tracking-wide mb-3">
            By {breakdown.level === 'zones' ? 'Zone' : 'Sub-Unit'}
          </h2>
          {breakdown.items.length === 0 ? (
            <p className="text-gray-400 text-sm">No data yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-400 text-xs uppercase tracking-wide">
                    <th className="py-1 pr-3 font-semibold">{breakdown.level === 'zones' ? 'Zone' : 'Sub-Unit'}</th>
                    <th className="py-1 pr-3 font-semibold text-right">Members</th>
                    <th className="py-1 pr-3 font-semibold text-right">Collected</th>
                    <th className="py-1 font-semibold text-right">Outstanding</th>
                  </tr>
                </thead>
                <tbody>
                  {breakdown.items.map((item) => (
                    <tr key={item.id} className="border-t border-gray-100">
                      <td className="py-2 pr-3 font-medium text-slate-800">{item.name}</td>
                      <td className="py-2 pr-3 text-right text-gray-600">{item.members.toLocaleString()}</td>
                      <td className="py-2 pr-3 text-right text-emerald-700 font-semibold">{naira(item.collected)}</td>
                      <td className="py-2 text-right text-amber-600 font-semibold">{naira(item.outstanding)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Current period */}
      {periodSummary ? (
        <div className="bg-white rounded-xl border border-emerald-100 shadow-sm overflow-hidden mb-6">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4">
            <div>
              <h2 className="text-sm font-semibold text-emerald-900 uppercase tracking-wide">Current Period</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {MONTHS[periodSummary.period.month - 1]} {periodSummary.period.year} · {periodSummary.paid} of {periodSummary.total} paid
              </p>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">
              {periodSummary.unpaid} outstanding
            </span>
          </div>
          {periodSummary.members.length === 0 ? (
            <p className="px-5 py-4 text-gray-400 text-sm">No members in your scope for this period.</p>
          ) : (
            <div className="overflow-x-auto mt-2">
              <table className="w-full text-sm min-w-[480px]">
                <thead>
                  <tr className="bg-emerald-50 text-emerald-700 text-left">
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Code</th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Name</th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Status</th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Paid At</th>
                    {showQuickCollect && <th className="px-4 py-3 font-semibold whitespace-nowrap"></th>}
                  </tr>
                </thead>
                <tbody>
                  {periodSummary.members.map((m) => (
                    <tr key={m.id} className="border-t border-gray-100">
                      <td className="px-4 py-2.5 font-mono text-emerald-700 font-semibold whitespace-nowrap">{m.member_code}</td>
                      <td className="px-4 py-2.5 font-medium text-slate-800 whitespace-nowrap">{m.name}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${m.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {m.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">{m.paid_at ? new Date(m.paid_at).toLocaleString() : '—'}</td>
                      {showQuickCollect && (
                        <td className="px-4 py-2.5 text-right whitespace-nowrap">
                          {m.status === 'UNPAID' ? (
                            <Link
                              to={`/collect?member=${encodeURIComponent(m.member_code)}`}
                              className="inline-block px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition"
                            >
                              Collect
                            </Link>
                          ) : null}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}

      {/* Recent payments */}
      <div className="bg-white rounded-xl border border-emerald-100 shadow-sm overflow-hidden">
        <h2 className="text-sm font-semibold text-emerald-900 uppercase tracking-wide px-5 pt-4">Recent Payments</h2>
        {recentPayments.length === 0 ? (
          <p className="px-5 py-4 text-gray-400 text-sm">No payments recorded yet.</p>
        ) : (
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="bg-emerald-50 text-emerald-700 text-left">
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Member</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Code</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap text-right">Amount</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Method</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Status</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Receipt</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentPayments.map((p) => (
                  <tr key={p.id} className="border-t border-gray-100">
                    <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">{p.member_name}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{p.member_code}</td>
                    <td className="px-4 py-3 text-emerald-700 font-semibold whitespace-nowrap text-right">{naira(p.amount)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.method === 'CASH' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                        {p.method}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        p.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-700' :
                        p.status === 'REFUNDED' ? 'bg-red-100 text-red-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{p.receipt_number || '—'}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{p.created_at ? new Date(p.created_at).toLocaleString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}