import { useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

const PARENT = {
  unit: { key: 'zone_id', endpoint: '/api/zones', label: 'Zone', listKey: 'zone_id' },
  subUnit: { key: 'unit_id', endpoint: '/api/units', label: 'Unit', listKey: 'unit_id' },
};

const inputCls =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500';

export default function OrgList({ title, endpoint, createKind }) {
  const { user } = useAuth();
  const canCreate = user?.role === 'Central Management' && !!createKind;
  const parent = PARENT[createKind];

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [parents, setParents] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ serial_number: '', name: '', parent_id: '' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');

  const load = () => {
    setLoading(true);
    api.get(endpoint)
      .then((res) => setItems(res.data.data || []))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [endpoint]);

  useEffect(() => {
    if (!parent) return;
    api.get(parent.endpoint)
      .then((res) => setParents(res.data.data || []))
      .catch(() => setParents([]));
  }, [parent]);

  const parentName = (id) => parents.find((p) => String(p.id) === String(id))?.name || '—';

  const submit = async (e) => {
    e.preventDefault();
    setFormError('');
    setNotice('');
    if (!form.name.trim() || !form.serial_number.trim()) {
      return setFormError('Name and serial number are required');
    }
    if (parent && !form.parent_id) return setFormError(`Choose a ${parent.label}`);

    setSaving(true);
    try {
      const payload = { name: form.name.trim(), serial_number: form.serial_number.trim() };
      if (parent) payload[parent.key] = Number(form.parent_id);
      await api.post(endpoint, payload);
      setForm({ serial_number: '', name: '', parent_id: form.parent_id });
      setNotice(`${title.replace(/s$/, '')} created.`);
      load();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to create');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h1 className="text-2xl font-bold text-emerald-900">{title}</h1>
        {canCreate && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="whitespace-nowrap px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition"
          >
            {showForm ? 'Cancel' : `+ New ${title.replace(/s$/, '')}`}
          </button>
        )}
      </div>

      {canCreate && showForm && (
        <div className="bg-white rounded-xl border border-emerald-100 shadow-sm p-5 mb-4 max-w-xl">
          {formError && <div className="mb-3 bg-red-50 text-red-600 border border-red-200 rounded-lg px-3 py-2 text-sm">{formError}</div>}
          <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {parent && (
              <div className="sm:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-1">{parent.label} *</label>
                <select
                  className={inputCls}
                  value={form.parent_id}
                  onChange={(e) => setForm({ ...form, parent_id: e.target.value })}
                  required
                >
                  <option value="">Select {parent.label.toLowerCase()}</option>
                  {parents.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Name *</label>
              <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Name" required />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Serial Number *</label>
              <input className={inputCls} value={form.serial_number} onChange={(e) => setForm({ ...form, serial_number: e.target.value })} placeholder="e.g. ZN-007" required />
            </div>
            <div className="sm:col-span-2">
              <button type="submit" disabled={saving} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-semibold rounded-lg transition">
                {saving ? 'Saving...' : `Create ${title.replace(/s$/, '')}`}
              </button>
            </div>
          </form>
        </div>
      )}

      {notice && <div className="mb-4 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg px-3 py-2 text-sm max-w-xl">{notice}</div>}
      {error && <div className="mb-4 bg-red-50 text-red-600 border border-red-200 rounded-lg px-3 py-2 text-sm">{error}</div>}

      {loading ? (
        <p className="text-gray-400">Loading...</p>
      ) : (
        <div className="bg-white rounded-xl border border-emerald-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[400px]">
              <thead>
                <tr className="bg-emerald-50 text-emerald-700 text-left">
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Name</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Serial</th>
                  {parent && <th className="px-4 py-3 font-semibold whitespace-nowrap">{parent.label}</th>}
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Status</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr><td className="px-4 py-3 text-gray-400" colSpan={parent ? 4 : 3}>No records.</td></tr>
                ) : items.map((item) => (
                  <tr key={item.id} className="border-t border-gray-100">
                    <td className="px-4 py-3 text-gray-800 whitespace-nowrap">{item.name}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{item.serial_number}</td>
                    {parent && <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{parentName(item[parent.listKey])}</td>}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                          item.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {item.status}
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
