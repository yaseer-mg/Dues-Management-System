const db = require('../config/database');

// Per-branch aggregate summary across the whole hierarchy:
//   zones[]  -> members, expected, paid, unpaid (per level)
//   units[]
//   sub_units[]
// "expected/paid/unpaid" are measured against the current (latest open)
// contribution period; the LEFT JOIN guarantees every member appears even if
// they were registered after the period opened.
async function getBranchSummary({ scope }) {
  const period = (await db('contribution_periods')
    .where('status', 'OPEN')
    .orderBy('year', 'desc')
    .orderBy('month', 'desc')
    .first());

  const SELECT = {
    zones: ['zones.id', 'zones.name', 'zones.name as zone_name'],
    units: ['zones.name as zone_name', 'units.id', 'units.name'],
    sub_units: ['zones.name as zone_name', 'units.name as unit_name', 'sub_units.id', 'sub_units.name'],
  };

  const build = async (level) => {
    const q = db('members')
      .join('sub_units', 'sub_units.id', 'members.sub_unit_id')
      .join('units', 'units.id', 'sub_units.unit_id')
      .join('zones', 'zones.id', 'units.zone_id')
      .leftJoin('member_contributions as mc', function () {
        this.on('mc.member_id', 'members.id');
        if (period) this.andOn('mc.contribution_period_id', period.id);
        else this.onRaw('1 = 0');
      });
    scope.query(q, 'members');

    const cols = SELECT[level];
    const group = cols.map((c) => c.replace(/\s+as\s+\w+$/i, '').trim());
    q.groupBy(...group)
      .select(...cols)
      .count('members.id as members')
      .select(db.raw('COALESCE(SUM(mc.expected_amount), 0) as expected'))
      .select(db.raw(`SUM(CASE WHEN mc.status = 'PAID' THEN 1 ELSE 0 END) as paid`))
      .select(db.raw(`SUM(CASE WHEN mc.status = 'UNPAID' THEN 1 ELSE 0 END) as unpaid`));

    const rows = await q;
    return rows.map((r) => ({
      id: Number(r.id) || null,
      name: r.name,
      zone_name: r.zone_name || null,
      unit_name: r.unit_name || null,
      members: Number(r.members) || 0,
      expected: Number(r.expected) || 0,
      paid: Number(r.paid) || 0,
      unpaid: Number(r.unpaid) || 0,
    }));
  };

  const [zones, units, subUnits] = await Promise.all(['zones', 'units', 'sub_units'].map(build));

  return {
    period: period ? { id: period.id, month: period.month, year: period.year } : null,
    zones,
    units,
    subUnits,
  };
}

module.exports = { getBranchSummary };