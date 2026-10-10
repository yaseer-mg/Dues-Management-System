import { useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

const REPORTS = [
  {
    key: 'members',
    title: 'Membership Report',
    description: 'Members in the selected scope: code, contacts, org branch and dues category.',
    statuses: ['ACTIVE', 'INACTIVE'],
    period: false,
  },
  {
    key: 'contributions',
    title: 'Contributions Report',
    description: 'Per-member dues: expected vs paid, method and receipt.',
    statuses: ['PAID', 'UNPAID'],
    period: true,
  },
  {
    key: 'payments',
    title: 'Payments Report',
    description: 'Payments: amount, method, status, who recorded/refunded it.',
    statuses: ['PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'REFUNDED'],
    period: true,
  },
];

const inputCls =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white';

export default function Reports() {
  const { user } = useAuth();
  const [downloading, setDownloading] = useState(null); // `${key}-${format}`
  const [error, setError] = useState('');

  const showRegionFilter = ['Central Management', 'Region Management'].includes(user?.role);

  const [regions, setRegions] = useState([]);
  const [zones, setZones] = useState([]);
  const [units, setUnits] = useState([]);
  const [subUnits, setSubUnits] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [regionId, setRegionId] = useState(user?.region_id ? String(user.region_id) : '');
  const [zoneId, setZoneId] = useState(user?.zone_id ? String(user.zone_id) : '');
  const [unitId, setUnitId] = useState(user?.unit_id ? String(user.unit_id) : '');
  const [subUnitId, setSubUnitId] = useState(user?.sub_unit_id ? String(user.sub_unit_id) : '');
  const [periodId, setPeriodId] = useState('');
  const [statuses, setStatuses] = useState({ members: '', contributions: '', payments: '' });

  const loadZones = async (rid) => {
    try {
      const res = await api.get('/api/zones', { params: rid ? { region_id: rid } : {} });
      setZones(res.data.data || []);
    } catch {
      setZones([]);
    }
  };

  const loadUnits = async (zid) => {
    try {
      const res = zid
        ? await api.get('/api/units', { params: { zone_id: zid } })
        : await api.get('/api/units');
      setUnits(res.data.data || []);
    } catch {
      setUnits([]);
    }
  };

  const loadSubUnits = async (uid) => {
    try {
      const res = uid
        ? await api.get('/api/sub-units', { params: { unit_id: uid } })
        : await api.get('/api/sub-units');
      setSubUnits(res.data.data || []);
    } catch {
      setSubUnits([]);
    }
  };

  useEffect(() => {
    api.get('/api/contribution-periods')
      .then((res) => setPeriods(res.data.data || []))
      .catch(() => {});
    if (showRegionFilter) {
      api.get('/api/regions')
        .then((res) => {
          const list = res.data.data || [];
          setRegions(list);
          loadZones(user?.region_id ? String(user.region_id) : '');
        })
        .catch(() => loadZones(''));
    } else {
      loadZones('');
    }
    if (user?.zone_id) loadUnits(String(user.zone_id));
    if (user?.unit_id) loadSubUnits(String(user.unit_id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onRegionChange = (e) => {
    const id = e.target.value;
    setRegionId(id);
    setZoneId('');
    setUnitId('');
    setSubUnitId('');
    setUnits([]);
    setSubUnits([]);
    loadZones(id);
  };

  const onZoneChange = (e) => {
    const id = e.target.value;
    setZoneId(id);
    setUnitId('');
    setSubUnitId('');
    setSubUnits([]);
    loadUnits(id);
  };

  const onUnitChange = (e) => {
    const id = e.target.value;
    setUnitId(id);
    setSubUnitId('');
    loadSubUnits(id);
  };

  const orgParams = () => {
    if (subUnitId) return { sub_unit_id: subUnitId };
    if (unitId) return { unit_id: unitId };
    if (zoneId) return { zone_id: zoneId };
    if (regionId) return { region_id: regionId };
    return {};
  };

  const scopeLabel = (() => {
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
    if (regionId) {
      const r = regions.find((x) => String(x.id) === String(regionId));
      return `Region: ${r ? r.name : ''}`;
    }
    return 'All records in your scope';
  })();

  const download = async (report, format) => {
    const { key } = report;
    const tag = `${key}-${format}`;
    setDownloading(tag);
    setError('');
    try {
      const params = { format, ...orgParams() };
      if (report.period && periodId) params.period_id = periodId;
      if (statuses[key]) params.status = statuses[key];

      const res = await api.get(`/api/reports/${key}`, { params, responseType: 'blob' });
      const cd = res.headers['content-disposition'] || '';
      const m = cd.match(/filename="?([^";]+)"?/);
      const name = (m && m[1]) || `${key}-report.${format}`;
      const url = window.URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.response?.data?.message || 'Export failed');
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-emerald-900 mb-1">Reports</h1>
      <p className="text-gray-600 mb-6">Filter by branch and export membership, contribution or payment reports.</p>

      {error && <div className="mb-4 bg-red-50 text-red-600 border border-red-200 rounded-lg px-3 py-2 text-sm">{error}</div>}

      <div className="bg-white rounded-xl border border-emerald-100 shadow-sm p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-emerald-900 uppercase tracking-wide">Filter</h2>
          <span className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-3 py-1">
            {scopeLabel}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {showRegionFilter && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Region</label>
              <select className={inputCls} value={regionId} onChange={onRegionChange}>
                <option value="">All Regions</option>
                {regions.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
          )}
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
            <select className={inputCls} value={unitId} onChange={onUnitChange}>
              <option value="">All Units</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Sub-Unit</label>
            <select className={inputCls} value={subUnitId} onChange={(e) => setSubUnitId(e.target.value)}>
              <option value="">All Sub-Units</option>
              {subUnits.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Period</label>
            <select className={inputCls} value={periodId} onChange={(e) => setPeriodId(e.target.value)}>
              <option value="">All Periods</option>
              {periods.map((p) => (
                <option key={p.id} value={p.id}>{p.year}-{String(p.month).padStart(2, '0')}</option>
              ))}
            </select>
            <p className="text-[11px] text-gray-400 mt-1">Applies to contributions &amp; payments.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {REPORTS.map((r) => (
          <div key={r.key} className="bg-white rounded-xl border border-emerald-100 shadow-sm p-5 flex flex-col">
            <h2 className="text-sm font-semibold text-emerald-900 uppercase tracking-wide">{r.title}</h2>
            <p className="text-xs text-gray-500 mt-1 mb-3 flex-1">{r.description}</p>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Status</label>
            <select
              className={`${inputCls} mb-3`}
              value={statuses[r.key]}
              onChange={(e) => setStatuses((s) => ({ ...s, [r.key]: e.target.value }))}
            >
              <option value="">All</option>
              {r.statuses.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <div className="flex gap-2">
              {['csv', 'xlsx', 'pdf'].map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => download(r, fmt)}
                  disabled={downloading === `${r.key}-${fmt}`}
                  className="flex-1 px-3 py-1.5 border border-emerald-300 text-emerald-700 hover:bg-emerald-50 disabled:opacity-60 text-xs font-semibold rounded-lg transition uppercase"
                >
                  {downloading === `${r.key}-${fmt}` ? '...' : fmt}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
