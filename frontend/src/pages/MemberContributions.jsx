import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';
import ReceiptModal from '../components/ReceiptModal';
import { useAuth } from '../context/AuthContext';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function MemberContributions() {
  const { id } = useParams();
  const { user } = useAuth();
  const isCentral = user?.role === 'Central Management';
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloadingId, setDownloadingId] = useState(null);
  const [dlError, setDlError] = useState('');
  const [viewing, setViewing] = useState(null); // { url, name } receipt being previewed
  const [openingId, setOpeningId] = useState(null);
  const [refundTarget, setRefundTarget] = useState(null); // contribution pending refund confirmation
  const [refundReason, setRefundReason] = useState('');
  const [refunding, setRefunding] = useState(false);
  const [refundError, setRefundError] = useState('');

  useEffect(() => {
    reload();
  }, [id]);

  const reload = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/api/members/${id}/contributions`);
      setData(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load contributions');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const downloadReceipt = async (paymentId) => {
    setDownloadingId(paymentId);
    setDlError('');
    try {
      const res = await api.get(`/api/receipts/${paymentId}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(res.data);
      const cd = res.headers['content-disposition'] || '';
      const m = cd.match(/filename="?([^";]+)"?/);
      const name = (m && m[1]) || `receipt-${paymentId}.pdf`;
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setDlError(err.response?.data?.message || 'Could not download receipt');
    } finally {
      setDownloadingId(null);
    }
  };

  const viewReceipt = async (paymentId) => {
    setOpeningId(paymentId);
    setDlError('');
    try {
      const res = await api.get(`/api/receipts/${paymentId}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(res.data);
      const cd = res.headers['content-disposition'] || '';
      const m = cd.match(/filename="?([^";]+)"?/);
      const name = (m && m[1]) || `receipt-${paymentId}.pdf`;
      setViewing({ url, name });
    } catch (err) {
      setDlError(err.response?.data?.message || 'Could not open receipt');
    } finally {
      setOpeningId(null);
    }
  };

  const closeViewer = () => {
    if (viewing) window.URL.revokeObjectURL(viewing.url);
    setViewing(null);
  };

  const startRefund = (c) => {
    setRefundTarget(c);
    setRefundReason('');
    setRefundError('');
  };

  const cancelRefund = () => {
    if (!refunding) {
      setRefundTarget(null);
      setRefundReason('');
      setRefundError('');
    }
  };

  const confirmRefund = async () => {
    if (!refundTarget) return;
    const reason = refundReason.trim();
    if (!reason) {
      setRefundError('Please provide a reason for the refund');
      return;
    }
    setRefunding(true);
    setRefundError('');
    try {
      await api.post(`/api/payments/${refundTarget.payment_id}/refund`, { reason });
      setRefunding(false);
      setRefundTarget(null);
      setRefundReason('');
      reload();
    } catch (err) {
      setRefunding(false);
      setRefundError(err.response?.data?.message || 'Refund failed');
    }
  };

  const periodLabel = (c) => `${MONTHS[c.month - 1]} ${c.year}`;

  if (loading) return <p className="text-gray-400">Loading...</p>;
  if (error) return <div className="bg-red-50 text-red-600 border border-red-200 rounded-lg px-3 py-2 text-sm">{error}</div>;
  if (!data) return null;

  const { member, contributions } = data;
  const paidCount = contributions.filter((c) => c.status === 'PAID').length;
  const total = contributions.length;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h1 className="text-2xl font-bold text-emerald-900">Contributions</h1>
        <Link to="/members" className="px-4 py-2 border border-emerald-600 text-emerald-700 hover:bg-emerald-50 font-semibold rounded-lg transition">
          Back to Members
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-emerald-100 shadow-sm p-5 mb-6">
        <div className="flex flex-wrap gap-x-8 gap-y-2">
          <div>
            <div className="text-xs uppercase tracking-wide text-gray-400">Member Code</div>
            <div className="font-mono text-emerald-700 font-semibold">{member.member_code}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-gray-400">Name</div>
            <div className="text-slate-800 font-semibold">{member.name}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-gray-400">Paid</div>
            <div className="text-slate-800 font-semibold">{paidCount} of {total}</div>
          </div>
        </div>
      </div>

      {dlError && <div className="mb-4 bg-red-50 text-red-600 border border-red-200 rounded-lg px-3 py-2 text-sm">{dlError}</div>}

      {contributions.length === 0 ? (
        <p className="text-gray-400">No contributions recorded for this member.</p>
      ) : (
        <div className="bg-white rounded-xl border border-emerald-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[500px]">
              <thead>
                <tr className="bg-emerald-50 text-emerald-700 text-left">
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Period</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Expected</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Status</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Paid At</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap"></th>
                </tr>
              </thead>
              <tbody>
                {contributions.map((c) => (
                  <tr key={c.id} className="border-t border-gray-100">
                    <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">{MONTHS[c.month - 1]} {c.year}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">₦{Number(c.expected_amount).toLocaleString()}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${c.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{c.paid_at ? new Date(c.paid_at).toLocaleString() : '—'}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {c.payment_id ? (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => viewReceipt(c.payment_id)}
                            disabled={openingId === c.payment_id}
                            className="px-3 py-1.5 border border-emerald-300 text-emerald-700 hover:bg-emerald-50 disabled:opacity-60 text-xs font-semibold rounded-lg transition"
                          >
                            {openingId === c.payment_id ? 'Opening...' : 'View'}
                          </button>
                          <button
                            onClick={() => downloadReceipt(c.payment_id)}
                            disabled={downloadingId === c.payment_id}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-semibold rounded-lg transition"
                          >
                            {downloadingId === c.payment_id ? 'Downloading...' : 'Receipt'}
                          </button>
                          {isCentral ? (
                            <button
                              onClick={() => startRefund(c)}
                              className="px-3 py-1.5 border border-red-300 text-red-700 hover:bg-red-50 text-xs font-semibold rounded-lg transition"
                            >
                              Refund
                            </button>
                          ) : null}
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ReceiptModal title={viewing?.name} url={viewing?.url} onClose={closeViewer} />

      {refundTarget ? (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-emerald-900">Refund payment?</h3>
            <p className="text-sm text-gray-600 mt-2">
              This will refund the <span className="font-semibold">₦{Number(refundTarget.expected_amount).toLocaleString()}</span> payment for{' '}
              <span className="font-semibold">{periodLabel(refundTarget)}</span>. The contribution returns to UNPAID and the payment is kept
              in history with a REFUNDED status.
            </p>
            <label className="block mt-4 text-sm font-semibold text-slate-700">
              Reason <span className="text-red-500">*</span>
              <textarea
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                rows={3}
                placeholder="Why is this payment being refunded?"
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </label>
            {refundError && <div className="mt-3 bg-red-50 text-red-600 border border-red-200 rounded-lg px-3 py-2 text-sm">{refundError}</div>}
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={cancelRefund}
                disabled={refunding}
                className="px-4 py-2 border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-60 text-sm font-semibold rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmRefund}
                disabled={refunding}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition"
              >
                {refunding ? 'Refunding...' : 'Confirm Refund'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
