import { useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

const EMPTY_FORM = { name: '', phone: '', gender: '', contribution_category_id: '' };

export default function Members() {
  const { user } = useAuth();
  const canRegister = user?.role === 'Sub-Unit Management';

  const [members, setMembers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadMembers = async (term = '') => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/api/members', { params: term ? { search: term } : {} });
      setMembers(res.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load members');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
    api.get('/api/categories')
      .then((res) => setCategories(res.data.data || []))
      .catch(() => {});
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    loadMembers(search.trim());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      await api.post('/api/members', {
        name: form.name,
        phone: form.phone || null,
        gender: form.gender || null,
        contribution_category_id: Number(form.contribution_category_id),
      });
      setForm(EMPTY_FORM);
      setShowForm(false);
      await loadMembers();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to register member');
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500';

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h1 className="text-2xl font-bold text-emerald-900">Members</h1>
        {canRegister && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="whitespace-nowrap px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition"
          >
            {showForm ? 'Cancel' : '+ Register Member'}
          </button>
        )}
      </div>

      {/* Registration form (Sub-Unit Management only) */}
      {canRegister && showForm && (
        <div className="bg-white rounded-xl border border-emerald-100 shadow-sm p-5 mb-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Register New Member</h2>
          {formError && (
            <div className="mb-4 bg-red-50 text-red-600 border border-red-200 rounded-lg px-3 py-2 text-sm">
              {formError}
            </div>
          )}
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Full Name *</label>
              <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" required />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Phone</label>
              <input className={inputCls} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Phone number" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Gender</label>
              <select className={inputCls} value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                <option value="">Select</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Contribution Category *</label>
              <select className={inputCls} value={form.contribution_category_id} onChange={(e) => setForm({ ...form, contribution_category_id: e.target.value })} required>
                <option value="">Select category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{(`${c.name} — ₦${Number(c.amount).toLocaleString()}`)}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold rounded-lg transition">
                {saving ? 'Saving...' : 'Register Member'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search bar */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-4">
        <input
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          placeholder="Search by name or member code..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button type="submit" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition">
          Search
        </button>
      </form>

      {error && <div className="bg-red-50 text-red-600 border border-red-200 rounded-lg px-3 py-2 text-sm mb-4">{error}</div>}

      {loading ? (
        <p className="text-gray-400">Loading...</p>
      ) : members.length === 0 ? (
        <p className="text-gray-400">No members found{search ? ` for "${search}"` : ''}.</p>
      ) : (
        <div className="bg-white rounded-xl border border-emerald-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="bg-emerald-50 text-emerald-700 text-left">
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Code</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Name</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Phone</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Category</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Status</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id} className="border-t border-gray-100">
                    <td className="px-4 py-3 font-mono text-emerald-700 whitespace-nowrap">{m.member_code}</td>
                    <td className="px-4 py-3 text-gray-800">{m.name}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{m.phone || '—'}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{m.category_name || '—'}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${m.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                        {m.status}
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