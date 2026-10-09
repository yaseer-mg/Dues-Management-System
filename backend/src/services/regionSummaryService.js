const db = require('../config/database');

// Region-scoped aggregate summary across the whole hierarchy:
//   regions[]   -> members, expected, paid, unpaid
//   zones[]     -> region + zone
//   units[]     -> region + zone + unit
//   sub_units[] -> region + zone + unit + sub-unit
// "expected/paid/unpaid" are measured against the current (latest open)
// contribution period; LEFT JOINs guarantee every branch appears even with no
// members or no contributions.
async function getRegionSummary({ scope }) {
  const period = await db('contribution_periods')
    .where('status', 'OPEN')
    .orderBy('year', 'desc')
    .orderBy('month', 'desc')
    .first();

  const build = async (level) => {
    const selects = {
      regions: ['regions.id', 'regions.name', 'regions.name as region_name'],
      zones: ['regions.name as region_name', 'zones.id', 'zones.name'],
      units: ['regions.name as region_name', 'zones.name as zone_name', 'units.id', 'units.name'],
      sub_units: ['regions.name as region_name', 'zones.name as zone_name', 'units.name as unit_name', 'sub_units.id', 'sub_units.name'],
    };

    const joins = {
      regions: (q) =>
        q
          .leftJoin('zones', 'zones.region_id', 'regions.id')
          .leftJoin('units', 'units.zone_id', 'zones.id')
          .leftJoin('sub_units', 'sub_units.unit_id', 'units.id'),
      zones: (q) =>
        q
          .leftJoin('units', 'units.zone_id', 'zones.id')
          .leftJoin('sub_units', 'sub_units.unit_id', 'units.id')
          .leftJoin('regions', 'regions.id', 'zones.region_id'),
      units: (q) =>
        q
          .leftJoin('sub_units', 'sub_units.unit_id', 'units.id')
          .leftJoin('zones', 'zones.id', 'units.zone_id')
          .leftJoin('regions', 'regions.id', 'zones.region_id'),
      sub_units: (q) =>
        q
          .join('units', 'units.id', 'sub_units.unit_id')
          .join('zones', 'zones.id', 'units.zone_id')
          .leftJoin('regions', 'regions.id', 'zones.region_id'),
    };

    const table = {
      regions: 'regions',
      zones: 'zones',
      units: 'units',
      sub_units: 'sub_units',
    }[level];

    const q = db(table);
    joins[level](q);
    q.leftJoin('members', 'members.sub_unit_id', 'sub_units.id').leftJoin('member_contributions as mc', function () {
      this.on('mc.member_id', 'members.id');
      if (period) this.andOn('mc.contribution_period_id', period.id);
      else this.onRaw('1 = 0');
    });

    if (level !== 'regions') scope.query(q, level);
    else scope.query(q, 'regions');

    const cols = selects[level];
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
      region_name: r.region_name || null,
      zone_name: r.zone_name || null,
      unit_name: r.unit_name || null,
      members: Number(r.members) || 0,
      expected: Number(r.expected) || 0,
      paid: Number(r.paid) || 0,
      unpaid: Number(r.unpaid) || 0,
    }));
  };

  const [regions, zones, units, subUnits] = await Promise.all(
    ['regions', 'zones', 'units', 'sub_units'].map(build)
  );

  return {
    period: period ? { id: period.id, month: period.month, year: period.year } : null,
    regions,
    zones,
    units,
    subUnits,
  };
}

module.exports = { getRegionSummary };