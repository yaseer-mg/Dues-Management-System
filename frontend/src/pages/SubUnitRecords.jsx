import { useEffect, useState } from 'react';
import api from '../api/client';
import ReceiptModal from '../components/ReceiptModal';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const naira = (n) => `₦${Number(n || 0).toLocaleString()}`;

function StatCard({ label, value, accent = 'text-emerald-700' }) {
  return (
    <div className="bg-white rounded-xl border border-emerald-100 shadow-sm p-4">
      <p className="text-xs uppercase tracking-wide text-gray-400">{label}</p>
      <p className={`text-xl font-bold mt-1 ${accent}`}>{value}</p>
    </div>
  );
}

export default function SubUnitRecords() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selected, setSelected] = useState(null); // chosen sub-unit
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  const [viewing, setViewing] = useState(null);
  const [openingId, setOpeningId] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await api.get('/api/sub-units/overview');
        if (active) setData(res.data.data);
      } catch (err) {
        if (active) setError(err.response?.data?.message || 'Failed to load sub-units');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const openSubUnit = async (subUnit) => {
    setSelected(subUnit);
    setDetail(null);
    setDetailError('');
    setDetailLoading(true);
    try {
      const res = await api.get(`/api/sub-units/${subUnit.id}/payments`);
      setDetail(res.data.data);
    } catch (err) {
      setDetailError(err.response?.data?.message || 'Failed to load payment records');
    } finally {
      setDetailLoading(false);
    }
  };

  const back = () => {
    setSelected(null);
    setDetail(null);
    setDetailError('');
  };

  const viewReceipt = async (paymentId) => {
    setOpeningId(paymentId);
    setDetailError('');
    try {
      const res = await api.get(`/api/receipts/${paymentId}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(res.data);
      const cd = res.headers['content-disposition'] || '';
      const m = cd.match(/filename="?([^";]+)"?/);
      setViewing({ url, name: (m && m[1]) || `receipt-${paymentId}.pdf` });
    } catch (err) {
      setDetailError(err.response?.data?.message || 'Could not open receipt');
    } finally {
      setOpeningId(null);
    }
  };

  const closeViewer = () => {
    if (viewing) window.URL.revokeObjectURL(viewing.url);
    setViewing(null);
  };

  if (loading) return <p className="text-gray-400">Loading...</p>;
  if (error) return <div className="bg-red-50 text-red-600 border border-red-200 rounded-lg px-3 py-2 text-sm">{error}</div>;
  if (!data) return null;

  // ----- Detail view: payment records for one sub-unit -----
  if (selected) {
    return (
      <div>
        <button onClick={back} className="mb-4 text-sm font-semibold text-emerald-700 hover:text-emerald-900">
          ← Back to sub-units
        </button>
        <h1 className="text-2xl font-bold text-emerald-900">{selected.name}</h1>
        <p className="text-gray-600 mb-4">
          {data.unit.name}
          {selected.serial_number ? ` · ${selected.serial_number}` : ''}
        </p>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard label="Total Members" value={selected.members.toLocaleString()} />
          <StatCard label="Collected" value={naira(selected.collected)} />
          <StatCard label="Outstanding" value={naira(selected.outstanding)} accent="text-amber-600" />
          <StatCard label="Paid Payments" value={selected.paid_payments.toLocaleString()} accent="text-slate-800" />
        </div>

        {detailError && <div className="mb-4 bg-red-50 text-red-600 border border-red-200 rounded-lg px-3 py-2 text-sm">{detailError}</div>}

        <div className="bg-white rounded-xl border border-emerald-100 shadow-sm overflow-hidden">
          <h2 className="text-sm font-semibold text-emerald-900 uppercase tracking-wide px-5 pt-4">Payment Records</h2>
          {detailLoading ? (
            <p className="px-5 py-4 text-gray-400 text-sm">Loading...</p>
          ) : !detail || detail.payments.length === 0 ? (
            <p className="px-5 py-4 text-gray-400 text-sm">No payment records yet.</p>
          ) : (
            <div className="overflow-x-auto mt-2">
              <table className="w-full text-sm min-w-[720px]">
                <thead>
                  <tr className="bg-emerald-50 text-emerald-700 text-left">
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Member</th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Code</th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Period</th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap text-right">Amount</th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Method</th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Status</th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Receipt</th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.payments.map((p) => (
                    <tr key={p.id} className="border-t border-gray-100">
                      <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">{p.member_name}</td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{p.member_code}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{MONTHS[p.month - 1]} {p.year}</td>
                      <td className="px-4 py-3 text-emerald-700 font-semibold whitespace-nowrap text-right">{naira(p.amount)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.method === 'CASH' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                          {p.method}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          p.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-700' :
                          p.status === 'REFUNDED' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {p.receipt_number && p.status === 'SUCCESS' ? (
                          <button
                            onClick={() => viewReceipt(p.id)}
                            disabled={openingId === p.id}
                            className="text-emerald-700 hover:text-emerald-900 font-semibold disabled:opacity-50"
                          >
                            {openingId === p.id ? 'Opening...' : p.receipt_number}
                          </button>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{new Date(p.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <ReceiptModal title={viewing?.name} url={viewing?.url} onClose={closeViewer} />
      </div>
    );
  }

  // ----- Overview: every sub-unit in the collector's unit -----
  return (
    <div>
      <h1 className="text-2xl font-bold text-emerald-900">Sub-Units</h1>
      <p className="text-gray-600 mb-4">
        Payment records for every sub-unit in <span className="font-semibold">{data.unit.name}</span>
        {data.unit.zone_name ? ` (${data.unit.zone_name})` : ''}
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Members" value={data.totals.members.toLocaleString()} />
        <StatCard label="Collected" value={naira(data.totals.collected)} />
        <StatCard label="Outstanding" value={naira(data.totals.outstanding)} accent="text-amber-600" />
        <StatCard label="Paid Payments" value={data.totals.paid_payments.toLocaleString()} accent="text-slate-800" />
      </div>

      {data.sub_units.length === 0 ? (
        <p className="text-gray-400">No sub-units in your unit.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {data.sub_units.map((s) => (
            <div key={s.id} className="bg-white rounded-xl border border-emerald-100 shadow-sm p-5 flex flex-col">
              <div className="mb-3">
                <h2 className="font-semibold text-slate-800">{s.name}</h2>
                <p className="text-xs text-gray-400">{s.serial_number}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm mb-4">
                <div className="flex justify-between">
                  <span className="text-gray-500">Members</span>
                  <span className="font-semibold text-slate-700">{s.members.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Paid</span>
                  <span className="font-semibold text-slate-800">{s.paid_payments.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between col-span-2">
                  <span className="text-gray-500">Collected</span>
                  <span className="font-semibold text-emerald-700">{naira(s.collected)}</span>
                </div>
                <div className="flex items-center justify-between col-span-2">
                  <span className="text-gray-500">Outstanding</span>
                  <span className="font-semibold text-amber-600">{naira(s.outstanding)}</span>
                </div>
              </div>
              <button
                onClick={() => openSubUnit(s)}
                className="mt-auto w-full px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition"
              >
                View Payment Records
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
