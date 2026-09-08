import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

const EMPTY_FORM = { name: '', phone: '', gender: '', contribution_category_id: '' };

export default function Members() {
  const { user } = useAuth();
  const canRegister = user?.role === 'Sub-Unit Management';
  // Only users without a fixed sub-unit can drill down the hierarchy.
  const showDrilldown = !user?.sub_unit_id;

  const [members, setMembers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');

  const [zones, setZones] = useState([]);
  const [units, setUnits] = useState([]);
  const [subUnits, setSubUnits] = useState([]);
  const [zoneId, setZoneId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [subUnitId, setSubUnitId] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadMembers = async (params = {}) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/api/members', { params });
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
    api.get('/api/zones')
      .then((res) => setZones(res.data.data || []))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload members whenever the drill-down selection changes.
  useEffect(() => {
    const params = {};
    if (subUnitId) params.sub_unit_id = subUnitId;
    else if (unitId) params.unit_id = unitId;
    else if (zoneId) params.zone_id = zoneId;
    if (query) params.search = query;
    loadMembers(params);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoneId, unitId, subUnitId, query]);

  const onZoneChange = async (e) => {
    const id = e.target.value;
    setZoneId(id);
    setUnitId('');
    setSubUnitId('');
    setSubUnits([]);
    try {
      const res = id ? await api.get('/api/units', { params: { zone_id: id } }) : null;
      setUnits(res ? res.data.data || [] : []);
    } catch {
      setUnits([]);
    }
  };

  const onUnitChange = async (e) => {
    const id = e.target.value;
    setUnitId(id);
    setSubUnitId('');
    try {
      const res = id ? await api.get('/api/sub-units', { params: { unit_id: id } }) : null;
      setSubUnits(res ? res.data.data || [] : []);
    } catch {
      setSubUnits([]);
    }
  };

  const onSubUnitChange = (e) => setSubUnitId(e.target.value);

  const handleSearch = (e) => {
    e.preventDefault();
    setQuery(search.trim());
  };

  const branchLabel = (() => {
    if (subUnitId) {
      const s = subUnits.find((x) => String(x.id) === String(subUnitId));
      return `Sub-Unit: ${s ? s.name : ''}`;
    }
    if (unitId) {
      const u = units.find((x) => String(x.id) === String(unitId));
      return `Unit: ${u ? u.name : ''}`;
    }
    if (zoneId) {
      const z = zones.find((x) => String(x.id) === String(zoneId));
      return `Zone: ${z ? z.name : ''}`;
    }
    return 'All branches';
  })();

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

      {/* Hierarchy drill-down (Zone → Unit → Sub-Unit) */}
      {showDrilldown && (
        <div className="bg-white rounded-xl border border-emerald-100 shadow-sm p-4 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Zone</label>
              <select className={inputCls} value={zoneId} onChange={onZoneChange}>
                <option value="">All Zones</option>
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>{z.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Unit</label>
              <select className={inputCls} value={unitId} onChange={onUnitChange} disabled={!zoneId}>
                <option value="">All Units</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Sub-Unit</label>
              <select className={inputCls} value={subUnitId} onChange={onSubUnitChange} disabled={!unitId}>
                <option value="">All Sub-Units</option>
                {subUnits.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

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
        <p className="text-gray-400">No members found{search ? ` for "${search}"` : ''} in this branch.</p>
      ) : (
        <div className="bg-white rounded-xl border border-emerald-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-emerald-50 text-emerald-800 text-xs font-semibold uppercase tracking-wide">
            {members.length} member{members.length === 1 ? '' : 's'} · {branchLabel}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[760px]">
              <thead>
                <tr className="bg-emerald-50 text-emerald-700 text-left">
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Code</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Name</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Phone</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Branch</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Category</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Status</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap"></th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id} className="border-t border-gray-100">
                    <td className="px-4 py-3 font-mono text-emerald-700 whitespace-nowrap">{m.member_code}</td>
                    <td className="px-4 py-3 text-gray-800">{m.name}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{m.phone || '—'}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {m.zone_name || '—'}{m.zone_name && m.unit_name ? ' / ' : ''}{m.unit_name || ''}{m.sub_unit_name ? ' / ' : ''}{m.sub_unit_name || ''}
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{m.category_name || '—'}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${m.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                        {m.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <Link to={`/members/${m.id}/contributions`} className="text-emerald-600 hover:text-emerald-800 font-medium text-xs">
                        History →
                      </Link>
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