import { useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

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
              <th className="px-4 py-2.5 font-semibold whitespace-nowrap">Region</th>
              <th className="px-4 py-2.5 font-semibold whitespace-nowrap">{title === 'Regions' ? 'Coordinator' : 'Branch'}</th>
              <th className="px-4 py-2.5 font-semibold text-right whitespace-nowrap">Members</th>
              <th className="px-4 py-2.5 font-semibold text-right whitespace-nowrap">Expected</th>
              <th className="px-4 py-2.5 font-semibold text-right whitespace-nowrap">Paid</th>
              <th className="px-4 py-2.5 font-semibold text-right whitespace-nowrap">Unpaid</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td className="px-4 py-3 text-gray-400" colSpan={5 + parents.length}>No data.</td></tr>
            ) : rows.map((r) => (
              <tr key={r.uid} className="border-t border-gray-100">
                {parents.map((p) => <td key={p} className="px-4 py-2.5 text-gray-500 whitespace-nowrap">{r[`${p.toLowerCase().replace(/[^a-z]+/g, '_')}`] || '—'}</td>)}
                <td className="px-4 py-2.5 font-medium text-slate-800 whitespace-nowrap">{r.region_name || r.name}</td>
                <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{r.coordinator_name ? `${r.coordinator_name} (${r.coordinator_phone})` : '—'}</td>
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

const field = 'border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 w-full';
const btn = 'px-4 py-2 rounded-lg bg-emerald-700 text-white text-sm font-medium hover:bg-emerald-800 transition disabled:opacity-50';

function RegionCard({ region, zones, regions, refresh }) {
  const regionZones = zones.filter((z) => String(z.region_id) === String(region.id));
  const otherZones = zones.filter((z) => String(z.region_id) !== String(region.id));
  const regionName = (rid) => regions.find((r) => String(r.id) === String(rid))?.name;

  const [selected, setSelected] = useState([]);
  const [coord, setCoord] = useState({ name: '', phone: '' });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const notify = (ok, text) => setMsg({ ok, text });
  const toggle = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const assignSelected = async () => {
    if (!selected.length) return notify(false, 'Select at least one zone');
    setBusy(true);
    try {
      await api.post(`/api/regions/${region.id}/zones`, { zone_ids: selected });
      notify(true, `${selected.length} zone${selected.length > 1 ? 's' : ''} assigned.`);
      setSelected([]);
      refresh();
    } catch (err) {
      notify(false, err.response?.data?.message || 'Failed to assign zones');
    } finally {
      setBusy(false);
    }
  };

  const removeZone = async (zoneId) => {
    setBusy(true);
    try {
      await api.delete(`/api/regions/${region.id}/zones/${zoneId}`);
      notify(true, 'Zone removed from region.');
      refresh();
    } catch (err) {
      notify(false, err.response?.data?.message || 'Failed to remove zone');
    } finally {
      setBusy(false);
    }
  };

  const saveCoordinator = async (e) => {
    e.preventDefault();
    if (!coord.name || !coord.phone) return notify(false, 'name and phone are required');
    setBusy(true);
    try {
      const res = await api.post(`/api/regions/${region.id}/coordinator`, coord);
      const pw = res.data.data?.password;
      notify(true, `Coordinator set: ${coord.name}${pw ? ` — password ${pw}` : ''}.`);
      setCoord({ name: '', phone: '' });
      refresh();
    } catch (err) {
      notify(false, err.response?.data?.message || 'Failed to set coordinator');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="border border-emerald-100 rounded-xl p-4 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="font-semibold text-emerald-900">
            {region.name} <span className="text-xs font-mono text-emerald-600">{region.serial_number}</span>
          </div>
          <div className="text-xs text-gray-500 mt-0.5">
            {region.coordinator_name
              ? `Coordinator: ${region.coordinator_name} (${region.coordinator_phone})`
              : 'No coordinator assigned'}
          </div>
        </div>
        <span className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-3 py-1">
          {regionZones.length} zone{regionZones.length === 1 ? '' : 's'}
        </span>
      </div>

      {msg && (
        <div className={`text-sm px-3 py-2 rounded-lg ${msg.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>{msg.text}</div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <form onSubmit={saveCoordinator} className="space-y-2">
          <div className="text-xs font-semibold uppercase text-gray-400">
            {region.coordinator_name ? 'Replace Coordinator' : 'Set Coordinator'}
          </div>
          <input className={field} placeholder="Coordinator name" value={coord.name} onChange={(e) => setCoord({ ...coord, name: e.target.value })} />
          <input className={field} placeholder="Phone e.g. 080..." value={coord.phone} onChange={(e) => setCoord({ ...coord, phone: e.target.value })} />
          <button className={btn} disabled={busy}>Save Coordinator</button>
          <p className="text-xs text-gray-400">Creates a Region Management login (password password123), or reassigns an existing account by phone.</p>
        </form>

        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase text-gray-400">Zones in this region</div>
          <div className="flex flex-wrap gap-2 min-h-[34px]">
            {regionZones.length === 0 ? (
              <span className="text-xs text-gray-400">No zones assigned yet.</span>
            ) : (
              regionZones.map((z) => (
                <span key={z.id} className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full pl-3 pr-2 py-1 text-xs">
                  {z.name}
                  <button type="button" onClick={() => removeZone(z.id)} disabled={busy} className="text-emerald-500 hover:text-red-600 font-bold" aria-label={`Remove ${z.name}`}>✕</button>
                </span>
              ))
            )}
          </div>

          <div className="pt-1">
            <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">Assign zones</label>
            <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg p-2 grid sm:grid-cols-2 gap-1 bg-white">
              {otherZones.length === 0 ? (
                <span className="text-xs text-gray-400">All zones are already in this region.</span>
              ) : (
                otherZones.map((z) => (
                  <label key={z.id} className="flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" checked={selected.includes(z.id)} onChange={() => toggle(z.id)} />
                    <span>
                      {z.name}
                      {z.region_id ? <span className="text-gray-400"> · in {regionName(z.region_id)}</span> : ''}
                    </span>
                  </label>
                ))
              )}
            </div>
            <button type="button" onClick={assignSelected} disabled={busy || !selected.length} className={`${btn} mt-2`}>
              Assign selected ({selected.length})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ManagementPanel({ regions, zones, refresh }) {
  const [name, setName] = useState('');
  const [serial, setSerial] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const notify = (ok, text) => setMsg({ ok, text });

  const createRegion = async (e) => {
    e.preventDefault();
    if (!name || !serial) return notify(false, 'name and serial number are required');
    setBusy(true);
    try {
      await api.post('/api/regions', { name, serial_number: serial });
      notify(true, `Region "${name}" created. Assign a coordinator and zones below.`);
      setName('');
      setSerial('');
      refresh();
    } catch (err) {
      notify(false, err.response?.data?.message || 'Failed to create region');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={createRegion} className="bg-white rounded-xl border border-emerald-100 shadow-sm p-4 flex flex-wrap items-end gap-3">
        <div className="text-sm font-semibold text-emerald-900 mr-auto">Region Management (Central)</div>
        <input className={`${field} max-w-[200px]`} placeholder="Region name" value={name} onChange={(e) => setName(e.target.value)} />
        <input className={`${field} max-w-[160px]`} placeholder="Serial e.g. RG-003" value={serial} onChange={(e) => setSerial(e.target.value)} />
        <button className={btn} disabled={busy}>Create Region</button>
      </form>

      {msg && (
        <div className={`text-sm px-3 py-2 rounded-lg ${msg.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>{msg.text}</div>
      )}

      {regions.length === 0 ? (
        <p className="text-sm text-gray-400">No regions yet. Create one above.</p>
      ) : (
        <div className="space-y-4">
          {regions.map((r) => (
            <RegionCard key={r.id} region={r} zones={zones} regions={regions} refresh={refresh} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function RegionSummary() {
  const { user } = useAuth();
  const [regions, setRegions] = useState([]);
  const [zones, setZones] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    Promise.all([api.get('/api/regions'), api.get('/api/regions/summary'), api.get('/api/zones')])
      .then(([r1, r2, r3]) => {
        setRegions(r1.data.data);
        setSummary(r2.data.data);
        setZones(r3.data.data);
      })
      .catch((err) => setError(err.response?.data?.message || 'Failed to load region summary'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  if (loading) return <p className="text-gray-400">Loading...</p>;
  if (error) return <div className="bg-red-50 text-red-600 border border-red-200 rounded-lg px-3 py-2 text-sm">{error}</div>;
  if (!summary) return null;

  const byId = {};
  regions.forEach((r) => { byId[r.id] = r; });

  const regionRows = summary.regions.map((r) => ({
    ...r,
    uid: `rg-${r.id}`,
    coordinator_name: byId[r.id]?.coordinator_name,
    coordinator_phone: byId[r.id]?.coordinator_phone,
  }));
  const zoneRows = summary.zones.map((z) => ({ ...z, uid: `z-${z.id}`, region_name: z.region_name || '—' }));
  const unitRows = summary.units.map((u) => ({ ...u, uid: `u-${u.id}` }));
  const subUnitRows = summary.subUnits.map((s) => ({ ...s, uid: `s-${s.id}` }));

  return (
    <div>
      <h1 className="text-2xl font-bold text-emerald-900 mb-1">Region Summary</h1>
      <p className="text-gray-600 mb-6">
        Members, expected, paid and unpaid{summary.period ? ` for ${MONTHS[summary.period.month - 1]} ${summary.period.year}` : ''} — Regions group zones, each with a coordinator.
      </p>

      {user?.role === 'Central Management' && (
        <div className="mb-6">
          <ManagementPanel regions={regions} zones={zones} refresh={load} />
        </div>
      )}

      <div className="space-y-6">
        <SummaryTable title="Regions" rows={regionRows} parents={[]} />
        <SummaryTable title="Zones" rows={zoneRows} parents={['Region']} />
        <SummaryTable title="Units" rows={unitRows} parents={['Region', 'Zone']} />
        <SummaryTable title="Sub-Units" rows={subUnitRows} parents={['Region', 'Zone', 'Unit']} />
      </div>
    </div>
  );
}