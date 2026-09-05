import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function ReceiptVerify() {
  const { verification_code } = useParams();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await api.get(`/receipt/verify/${verification_code}`);
        if (!active) return;
        setData(res.data.data);
      } catch (err) {
        if (!active) return;
        setError(err.response?.data?.message || 'This receipt could not be found.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [verification_code]);

  if (loading) {
    return (
      <div className="min-h-screen bg-emerald-50 flex items-center justify-center p-4">
        <p className="text-gray-400">Verifying receipt...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-emerald-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-xl border border-emerald-100 shadow-sm p-6 text-center">
          <h1 className="text-xl font-bold text-emerald-900 mb-3">Receipt Verification</h1>
          <p className="text-sm text-gray-600 mb-4">{error || 'Receipt not found.'}</p>
          <Link to="/" className="text-emerald-600 text-sm font-semibold hover:underline">Go to home</Link>
        </div>
      </div>
    );
  }

  const period = `${MONTHS[data.period.month - 1]} ${data.period.year}`;
  const date = data.date ? new Date(data.date).toLocaleString() : '—';

  const rows = [
    ['Receipt Number', <span key="rn" className="font-mono">{data.receipt_number}</span>],
    ['Member Code', <span key="mc" className="font-mono">{data.member_code}</span>],
    ['Amount', `₦${Number(data.amount).toLocaleString()}`],
    ['Period', period],
    ['Date', date],
    ['Method', data.method],
  ];

  return (
    <div className="min-h-screen bg-emerald-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl border border-emerald-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-1">
          <svg className="w-7 h-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <h1 className="text-lg font-bold text-emerald-900">Receipt Verified</h1>
        </div>
        <p className="text-sm text-gray-500 mb-5">
          This receipt is genuine and matches the official record.
        </p>

        <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 mb-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-emerald-800 font-semibold">Status</span>
            <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">{data.status}</span>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-sm text-emerald-800 font-semibold">Receipt No</span>
            <span className="font-mono text-sm text-emerald-700">{data.receipt_number}</span>
          </div>
        </div>

        <dl className="divide-y divide-gray-100">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between py-3">
              <dt className="text-sm text-gray-500">{label}</dt>
              <dd className="text-sm text-slate-800 font-medium">{value}</dd>
            </div>
          ))}
        </dl>

        <Link to="/" className="mt-4 block text-center text-sm text-emerald-600 font-semibold hover:underline">
          Go to home
        </Link>
      </div>
    </div>
  );
}