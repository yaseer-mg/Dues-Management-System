import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function PayLink() {
  const { token } = useParams();

  const [phase, setPhase] = useState('loading'); // loading | code | confirm | paying | error
  const [link, setLink] = useState(null);
  const [member, setMember] = useState(null);
  const [error, setError] = useState('');
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      setError('');
      try {
        const res = await api.get(`/payment/${token}`);
        if (!active) return;
        setLink(res.data.data);
        setPhase('code');
      } catch (err) {
        if (!active) return;
        setError(err.response?.data?.message || 'This payment link is invalid or has expired.');
        setPhase('error');
      }
    })();
    return () => { active = false; };
  }, [token]);

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');
    setVerifying(true);
    try {
      const res = await api.post(`/payment/${token}/verify-member`, { member_code: code });
      setMember(res.data.data);
      setPhase('confirm');
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed. Please check your member code.');
    } finally {
      setVerifying(false);
    }
  };

  const handlePay = async () => {
    setError('');
    setPaying(true);
    try {
      const res = await api.post(`/payment/${token}/pay`);
      const { authorization_url } = res.data.data;
      if (authorization_url) {
        window.location.href = authorization_url;
      } else {
        setError('Could not start payment. Please try again.');
        setPaying(false);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Could not start payment. Please try again.');
      setPaying(false);
    }
  };

  const amount = link ? `₦${Number(link.amount).toLocaleString()}` : '';
  const period = link ? `${MONTHS[link.month - 1]} ${link.year}` : '';

  const inputCls =
    'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500';

  if (phase === 'loading') {
    return (
      <div className="min-h-screen bg-emerald-50 flex items-center justify-center p-4">
        <p className="text-gray-400">Loading payment...</p>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="min-h-screen bg-emerald-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-xl border border-emerald-100 shadow-sm p-6 text-center">
          <h1 className="text-xl font-bold text-emerald-900 mb-3">Payment Link</h1>
          <p className="text-sm text-gray-600 mb-4">{error}</p>
          <Link to="/" className="text-emerald-600 text-sm font-semibold hover:underline">Go to home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-emerald-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl border border-emerald-100 shadow-sm p-6">
        <h1 className="text-2xl font-bold text-emerald-900 mb-1">Dues Payment</h1>
        <p className="text-sm text-gray-500 mb-6">Complete your monthly contribution securely.</p>

        {phase === 'code' && (
          <>
            <div className="mb-5 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 text-sm text-emerald-800">
              <p><span className="font-semibold">Period:</span> {period}</p>
              <p><span className="font-semibold">Amount Due:</span> {amount}</p>
            </div>
            <form onSubmit={handleVerify}>
              <label className="block text-sm font-semibold text-gray-700 mb-1" htmlFor="member_code">
                Member Code
              </label>
              <input
                id="member_code"
                className={inputCls}
                placeholder="e.g. MEM-000231"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                autoFocus
              />
              <button
                type="submit"
                disabled={verifying || !code.trim()}
                className="w-full mt-4 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-semibold rounded-lg transition"
              >
                {verifying ? 'Verifying...' : 'Continue'}
              </button>
            </form>
          </>
        )}

        {phase === 'confirm' && member && (
          <>
            <div className="mb-5 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 text-sm text-emerald-800">
              <p><span className="font-semibold">Member:</span> {member.name}</p>
              <p><span className="font-semibold">Code:</span> <span className="font-mono">{member.member_code}</span></p>
              <p><span className="font-semibold">Period:</span> {period}</p>
              <p><span className="font-semibold">Amount:</span> {amount}</p>
            </div>
            <button
              onClick={handlePay}
              disabled={paying}
              className="w-full px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-semibold rounded-lg transition"
            >
              {paying ? 'Redirecting to payment...' : `Pay ${amount}`}
            </button>
            <button
              onClick={() => { setPhase('code'); setMember(null); setError(''); }}
              disabled={paying}
              className="w-full mt-2 px-4 py-2.5 text-sm text-gray-500 hover:text-gray-700 font-medium transition"
            >
              Not you? Enter a different code
            </button>
          </>
        )}

        {error && (
          <div className="mt-4 bg-red-50 text-red-600 border border-red-200 rounded-lg px-3 py-2 text-sm">{error}</div>
        )}
      </div>
    </div>
  );
}
