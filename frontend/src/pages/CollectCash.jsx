import { useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const periodLabel = (c) => `${MONTHS[c.month - 1]} ${c.year}`;

export default function CollectCash() {
  const { user } = useAuth();
  const isCollector = user?.role === 'Collector';

  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  const [selected, setSelected] = useState(null);
  const [contribs, setContribs] = useState([]);
  const [contribLoading, setContribLoading] = useState(false);
  const [contribError, setContribError] = useState('');

  const [notice, setNotice] = useState('');
  const [payError, setPayError] = useState('');
  const [payingId, setPayingId] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    setSearching(true);
    setSearchError('');
    setNotice('');
    try {
      const res = await api.get('/api/members', { params: search.trim() ? { search: search.trim() } : {} });
      setResults(res.data.data || []);
      setSearched(true);
    } catch (err) {
      setSearchError(err.response?.data?.message || 'Search failed');
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const selectMember = async (member) => {
    setSelected(member);
    setContribError('');
    setNotice('');
    setPayError('');
    setContribLoading(true);
    try {
      const res = await api.get(`/api/members/${member.id}/contributions`);
      setContribs(res.data.data.contributions || []);
    } catch (err) {
      setContribError(err.response?.data?.message || 'Failed to load contributions');
      setContribs([]);
    } finally {
      setContribLoading(false);
    }
  };

  const collectPayment = async (mc) => {
    setPayingId(mc.id);
    setPayError('');
    setNotice('');
    try {
      const res = await api.post('/api/payments/cash', {
        member_contribution_id: mc.id,
        amount: mc.expected_amount,
      });
      setNotice(`Collected ${mc.expected_amount ? `₦${Number(mc.expected_amount).toLocaleString()}` : ''} for ${periodLabel(mc)}`);
      reloadContribs();
    } catch (err) {
      setPayError(err.response?.data?.message || 'Payment failed');
    } finally {
      setPayingId(null);
    }
  };

  const reloadContribs = async () => {
    try {
      const res = await api.get(`/api/members/${selected.id}/contributions`);
      setContribs(res.data.data.contributions || []);
    } catch (err) {
      setContribs([]);
    }
  };

  const inputCls =
    'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500';

  return (
    <div>
      <h1 className="text-2xl font-bold text-emerald-900 mb-2">Collect Cash</h1>
      {!isCollector && (
        <p className="text-amber-700 text-sm mb-4">
          Note: only Collectors can record cash payments. You can search and view, but confirming a payment will be rejected.
        </p>
      )}

      {/* Search member */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-4 max-w-xl">
        <input
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          placeholder="Search member by name or code..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button type="submit" disabled={searching} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-semibold rounded-lg transition">
          {searching ? '...' : 'Search'}
        </button>
      </form>
      {searchError && <div className="bg-red-50 text-red-600 border border-red-200 rounded-lg px-3 py-2 text-sm mb-4">{searchError}</div>}

      {/* Search results */}
      {searched && !searching && (
        <div className="bg-white rounded-xl border border-emerald-100 shadow-sm overflow-hidden mb-6 max-w-xl">
          {results.length === 0 ? (
            <p className="px-4 py-3 text-gray-400 text-sm">No members found.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {results.map((m) => (
                <li key={m.id}>
                  <button
                    onClick={() => selectMember(m)}
                    className={`w-full text-left px-4 py-3 hover:bg-emerald-50 transition flex items-center justify-between ${selected?.id === m.id ? 'bg-emerald-50' : ''}`}
                  >
                    <span>
                      <span className="font-mono text-emerald-700 text-sm">{m.member_code}</span>
                      <span className="ml-3 text-gray-800">{m.name}</span>
                    </span>
                    <span className="text-xs text-gray-400">select →</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Selected member's contributions */}
      {selected && (
        <div className="bg-white rounded-xl border border-emerald-100 shadow-sm p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <h2 className="text-lg font-semibold text-slate-800">
              {selected.name} <span className="font-mono text-emerald-700 text-sm">({selected.member_code})</span>
            </h2>
          </div>

          {notice && <div className="mb-4 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg px-3 py-2 text-sm">{notice}</div>}
          {payError && <div className="mb-4 bg-red-50 text-red-600 border border-red-200 rounded-lg px-3 py-2 text-sm">{payError}</div>}
          {contribError && <div className="mb-4 bg-red-50 text-red-600 border border-red-200 rounded-lg px-3 py-2 text-sm">{contribError}</div>}

          {contribLoading ? (
            <p className="text-gray-400 text-sm">Loading contributions...</p>
          ) : contribs.length === 0 ? (
            <p className="text-gray-400 text-sm">No contributions recorded for this member.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[520px]">
                <thead>
                  <tr className="bg-emerald-50 text-emerald-700 text-left">
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Period</th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Expected</th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Status</th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap"></th>
                  </tr>
                </thead>
                <tbody>
                  {contribs.map((c) => (
                    <tr key={c.id} className="border-t border-gray-100">
                      <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">{periodLabel(c)}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">₦{Number(c.expected_amount).toLocaleString()}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${c.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {c.status === 'UNPAID' ? (
                          <button
                            onClick={() => collectPayment(c)}
                            disabled={payingId === c.id}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-semibold rounded-lg transition"
                          >
                            {payingId === c.id ? 'Collecting...' : 'Collect Cash'}
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">paid</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
