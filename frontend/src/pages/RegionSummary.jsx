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

function ManagementPanel({ regions, refresh }) {
  const [name, setName] = useState('');
  const [serial, setSerial] = useState('');
  const [coordinator, setCoordinator] = useState({});
  const [zoneId, setZoneId] = useState('');
  const [regionsById, setRegionsById] = useState({});
  const [zones, setZones] = useState([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    const byId = {};
    regions.forEach((r) => { byId[r.id] = r; });
    setRegionsById(byId);
  }, [regions]);

  useEffect(() => {
    setCoordinator((c) => ({ ...c, region_id: regions[0]?.id }));
    api.get('/api/zones').then((res) => setZones(res.data.data)).catch(() => {});
  }, []);

  const notify = (ok, text) => setMsg({ ok, text });

  const createRegion = async (e) => {
    e.preventDefault();
    if (!name || !serial) return notify(false, 'name and serial number are required');
    setBusy(true);
    try {
      await api.post('/api/regions', { name, serial_number: serial });
      notify(true, `Region "${name}" created — now assign zones and a coordinator.`);
      setName(''); setSerial('');
      refresh();
    } catch (err) {
      notify(false, err.response?.data?.message || 'Failed to create region');
    } finally {
      setBusy(false);
    }
  };

  const createCoordinator = async (e) => {
    e.preventDefault();
    if (!coordinator.region_id || !coordinator.name || !coordinator.phone) return notify(false, 'choose a region, name and phone');
    setBusy(true);
    try {
      const res = await api.post(`/api/regions/${coordinator.region_id}/coordinator`, {
        name: coordinator.name,
        phone: coordinator.phone,
      });
      notify(true, `Coordinator created: ${coordinator.name} (${coordinator.phone}) — password ${res.data.data.password}.`);
      refresh();
    } catch (err) {
      notify(false, err.response?.data?.message || 'Failed to create coordinator');
    } finally {
      setBusy(false);
    }
  };

  const assignZone = async (e) => {
    e.preventDefault();
    if (!zoneId || !coordinator.region_id) return notify(false, 'choose a zone and a target region');
    setBusy(true);
    try {
      await api.post(`/api/regions/${coordinator.region_id}/zones`, { zone_id: Number(zoneId) });
      notify(true, 'Zone assigned.');
      refresh();
    } catch (err) {
      notify(false, err.response?.data?.message || 'Failed to assign zone');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-emerald-100 shadow-sm p-4 space-y-4">
      <h2 className="font-semibold text-emerald-900">Region Management (Central)</h2>
      {msg && (
        <div className={`text-sm px-3 py-2 rounded-lg ${msg.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>{msg.text}</div>
      )}

      <div className="grid md:grid-cols-3 gap-4">
        <form onSubmit={createRegion} className="space-y-2 border border-slate-100 rounded-lg p-3">
          <div className="text-xs font-semibold uppercase text-gray-400">New Region</div>
          <input className={field} placeholder="Region name" value={name} onChange={(e) => setName(e.target.value)} />
          <input className={field} placeholder="Serial, e.g. RG-003" value={serial} onChange={(e) => setSerial(e.target.value)} />
          <button className={btn} disabled={busy}>Create Region</button>
        </form>

        <form onSubmit={createCoordinator} className="space-y-2 border border-slate-100 rounded-lg p-3">
          <div className="text-xs font-semibold uppercase text-gray-400">Region Coordinator</div>
          <select className={field} value={coordinator.region_id || ''} onChange={(e) => setCoordinator({ ...coordinator, region_id: Number(e.target.value) })}>
            <option value="">Choose region</option>
            {regions.map((r) => <option key={r.id} value={r.id}>{r.name}{r.coordinator_name ? ` — ${r.coordinator_name}` : ''}</option>)}
          </select>
          <input className={field} placeholder="Coordinator name" value={coordinator.name || ''} onChange={(e) => setCoordinator({ ...coordinator, name: e.target.value })} />
          <input className={field} placeholder="Phone e.g. 080..." value={coordinator.phone || ''} onChange={(e) => setCoordinator({ ...coordinator, phone: e.target.value })} />
          <button className={btn} disabled={busy}>Create Coordinator</button>
          <p className="text-xs text-gray-400">Creates a Region Management login (password password123).</p>
        </form>

        <form onSubmit={assignZone} className="space-y-2 border border-slate-100 rounded-lg p-3">
          <div className="text-xs font-semibold uppercase text-gray-400">Assign Zone</div>
          <select className={field} value={zoneId} onChange={(e) => setZoneId(e.target.value)}>
            <option value="">Choose zone</option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name}{z.region_id ? ` — ${regionsById[z.region_id]?.name || 'assigned'}` : ' — unassigned'}
              </option>
            ))}
          </select>
          <select className={field} value={coordinator.region_id || ''} onChange={(e) => setCoordinator({ ...coordinator, region_id: Number(e.target.value) })}>
            <option value="">Target region</option>
            {regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <button className={btn} disabled={busy}>Assign Zone to Region</button>
        </form>
      </div>
    </div>
  );
}

export default function RegionSummary() {
  const { user } = useAuth();
  const [regions, setRegions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    Promise.all([api.get('/api/regions'), api.get('/api/regions/summary')])
      .then(([r1, r2]) => {
        setRegions(r1.data.data);
        setSummary(r2.data.data);
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
          <ManagementPanel regions={regions} refresh={load} />
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