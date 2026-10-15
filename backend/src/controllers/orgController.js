const db = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');
const { logAudit } = require('../services/auditService');

// ---------- Zones ----------

const createZone = asyncHandler(async (req, res) => {
  const { serial_number, name } = req.body;
  if (!serial_number || !name) {
    return res.error('serial_number and name are required', 400);
  }

  try {
    const [id] = await db('zones').insert({ serial_number, name });
    await logAudit({
      trx: db,
      user_id: req.user.user_id,
      action: 'ZONE_CREATED',
      entity: 'zone',
      entity_id: id,
      metadata: { serial_number, name },
    });
    return res.created({ id, serial_number, name }, 'Zone created');
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.error('A zone with this serial number already exists', 409);
    }
    throw err;
  }
});

const listZones = asyncHandler(async (req, res) => {
  const { region_id } = req.query;
  if (region_id !== undefined && (!Number.isInteger(Number(region_id)) || Number(region_id) <= 0)) {
    return res.error('region_id must be a positive integer', 400);
  }

  let query = db('zones').select('zones.*').orderBy('zones.name');
  if (region_id !== undefined) {
    query = query.where('zones.region_id', Number(region_id));
  }
  query = req.scope.query(query, 'zones');
  const zones = await query;
  return res.success(zones);
});

const getZone = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const zone = await req.scope.query(
    db('zones').select('zones.*').where('zones.id', id).first(),
    'zones'
  );
  if (!zone) return res.error('Zone not found', 404);
  return res.success(zone);
});

const updateZone = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, status } = req.body;

  const exists = await db('zones').where('id', id).first();
  if (!exists) return res.error('Zone not found', 404);

  const updates = {};
  if (name !== undefined) updates.name = name;
  if (status !== undefined) updates.status = status;

  if (Object.keys(updates).length === 0) {
    return res.error('Nothing to update', 400);
  }

  await db('zones').where('id', id).update(updates);
  await logAudit({
    trx: db,
    user_id: req.user.user_id,
    action: 'ZONE_UPDATED',
    entity: 'zone',
    entity_id: Number(id),
    metadata: { changes: updates },
  });
  const zone = await db('zones').where('id', id).first();
  return res.success(zone, 'Zone updated');
});

// ---------- Units ----------

const createUnit = asyncHandler(async (req, res) => {
  const { zone_id, serial_number, name } = req.body;
  if (!zone_id || !serial_number || !name) {
    return res.error('zone_id, serial_number and name are required', 400);
  }

  const zone = await db('zones').where('id', zone_id).first();
  if (!zone) return res.error('Zone not found', 400);

  try {
    const [id] = await db('units').insert({ zone_id, serial_number, name });
    await logAudit({
      trx: db,
      user_id: req.user.user_id,
      action: 'UNIT_CREATED',
      entity: 'unit',
      entity_id: id,
      metadata: { zone_id, serial_number, name },
    });
    return res.created({ id, zone_id, serial_number, name }, 'Unit created');
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.error('A unit with this serial number already exists', 409);
    }
    throw err;
  }
});

const listUnits = asyncHandler(async (req, res) => {
  const { zone_id } = req.query;
  if (zone_id !== undefined && (!Number.isInteger(Number(zone_id)) || Number(zone_id) <= 0)) {
    return res.error('zone_id must be a positive integer', 400);
  }

  let query = db('units').select('units.*').orderBy('units.name');
  if (zone_id !== undefined) {
    query = query.where('units.zone_id', Number(zone_id));
  }
  query = req.scope.query(query, 'units');
  const units = await query;
  return res.success(units);
});

const getUnit = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const unit = await req.scope.query(
    db('units').select('units.*').where('units.id', id).first(),
    'units'
  );
  if (!unit) return res.error('Unit not found', 404);
  return res.success(unit);
});

const updateUnit = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, status } = req.body;

  const exists = await db('units').where('id', id).first();
  if (!exists) return res.error('Unit not found', 404);

  const updates = {};
  if (name !== undefined) updates.name = name;
  if (status !== undefined) updates.status = status;

  if (Object.keys(updates).length === 0) {
    return res.error('Nothing to update', 400);
  }

  await db('units').where('id', id).update(updates);
  await logAudit({
    trx: db,
    user_id: req.user.user_id,
    action: 'UNIT_UPDATED',
    entity: 'unit',
    entity_id: Number(id),
    metadata: { changes: updates },
  });
  const unit = await db('units').where('id', id).first();
  return res.success(unit, 'Unit updated');
});

// ---------- Sub-Units ----------

const createSubUnit = asyncHandler(async (req, res) => {
  const { unit_id, serial_number, name } = req.body;
  if (!unit_id || !serial_number || !name) {
    return res.error('unit_id, serial_number and name are required', 400);
  }

  const unit = await db('units').where('id', unit_id).first();
  if (!unit) return res.error('Unit not found', 400);

  try {
    const [id] = await db('sub_units').insert({ unit_id, serial_number, name });
    await logAudit({
      trx: db,
      user_id: req.user.user_id,
      action: 'SUB_UNIT_CREATED',
      entity: 'sub_unit',
      entity_id: id,
      metadata: { unit_id, serial_number, name },
    });
    return res.created({ id, unit_id, serial_number, name }, 'Sub-Unit created');
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.error('A sub-unit with this serial number already exists', 409);
    }
    throw err;
  }
});

const listSubUnits = asyncHandler(async (req, res) => {
  const { unit_id } = req.query;
  if (unit_id !== undefined && (!Number.isInteger(Number(unit_id)) || Number(unit_id) <= 0)) {
    return res.error('unit_id must be a positive integer', 400);
  }

  let query = db('sub_units').select('sub_units.*').orderBy('sub_units.name');
  if (unit_id !== undefined) {
    query = query.where('sub_units.unit_id', Number(unit_id));
  }
  query = req.scope.query(query, 'sub_units');
  const subUnits = await query;
  return res.success(subUnits);
});

const getSubUnit = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const subUnit = await req.scope.query(
    db('sub_units').select('sub_units.*').where('sub_units.id', id).first(),
    'sub_units'
  );
  if (!subUnit) return res.error('Sub-Unit not found', 404);
  return res.success(subUnit);
});

const updateSubUnit = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, status } = req.body;

  const exists = await db('sub_units').where('id', id).first();
  if (!exists) return res.error('Sub-Unit not found', 404);

  const updates = {};
  if (name !== undefined) updates.name = name;
  if (status !== undefined) updates.status = status;

  if (Object.keys(updates).length === 0) {
    return res.error('Nothing to update', 400);
  }

  await db('sub_units').where('id', id).update(updates);
  await logAudit({
    trx: db,
    user_id: req.user.user_id,
    action: 'SUB_UNIT_UPDATED',
    entity: 'sub_unit',
    entity_id: Number(id),
    metadata: { changes: updates },
  });
  const subUnit = await db('sub_units').where('id', id).first();
  return res.success(subUnit, 'Sub-Unit updated');
});

// ---------- Collector sub-unit view ----------
// Collectors see every sub-unit within their own unit (e.g. "Abuja Unit A"
// collectors can review the payment records of all sub-units in that unit).

const subUnitOverview = asyncHandler(async (req, res) => {
  const unitId = req.user.unit_id;
  if (!unitId) return res.error('No unit is assigned to your account', 400);

  const unit = await db('units')
    .join('zones', 'zones.id', 'units.zone_id')
    .where('units.id', unitId)
    .select('units.id', 'units.name', 'zones.name as zone_name')
    .first();
  if (!unit) return res.error('Unit not found', 404);

  const subUnits = await db('sub_units')
    .where('unit_id', unitId)
    .orderBy('sub_units.name')
    .select('sub_units.id', 'sub_units.name', 'sub_units.serial_number');

  const stats = {};
  subUnits.forEach((s) => {
    stats[s.id] = { members: 0, collected: 0, outstanding: 0, paid_payments: 0 };
  });

  const ids = subUnits.map((s) => s.id);
  if (ids.length) {
    const [memberRows, collectedRows, outstandingRows] = await Promise.all([
      db('members')
        .whereIn('members.sub_unit_id', ids)
        .groupBy('members.sub_unit_id')
        .select('members.sub_unit_id')
        .count({ value: 'members.id' }),
      db('payments')
        .join('member_contributions', 'member_contributions.id', 'payments.member_contribution_id')
        .join('members', 'members.id', 'member_contributions.member_id')
        .whereIn('members.sub_unit_id', ids)
        .where('payments.status', 'SUCCESS')
        .groupBy('members.sub_unit_id')
        .select('members.sub_unit_id')
        .sum({ total: 'payments.amount' })
        .count({ count: 'payments.id' }),
      db('member_contributions')
        .join('members', 'members.id', 'member_contributions.member_id')
        .whereIn('members.sub_unit_id', ids)
        .where('member_contributions.status', 'UNPAID')
        .groupBy('members.sub_unit_id')
        .select('members.sub_unit_id')
        .sum({ total: 'member_contributions.expected_amount' }),
    ]);

    memberRows.forEach((r) => {
      if (stats[r.sub_unit_id]) stats[r.sub_unit_id].members = Number(r.value) || 0;
    });
    collectedRows.forEach((r) => {
      if (stats[r.sub_unit_id]) {
        stats[r.sub_unit_id].collected = Number(r.total) || 0;
        stats[r.sub_unit_id].paid_payments = Number(r.count) || 0;
      }
    });
    outstandingRows.forEach((r) => {
      if (stats[r.sub_unit_id]) stats[r.sub_unit_id].outstanding = Number(r.total) || 0;
    });
  }

  const totals = subUnits.reduce(
    (acc, s) => {
      const st = stats[s.id];
      acc.members += st.members;
      acc.collected += st.collected;
      acc.outstanding += st.outstanding;
      acc.paid_payments += st.paid_payments;
      return acc;
    },
    { members: 0, collected: 0, outstanding: 0, paid_payments: 0 }
  );

  return res.success({
    unit: { id: unit.id, name: unit.name, zone_name: unit.zone_name },
    totals,
    sub_units: subUnits.map((s) => ({ ...s, ...stats[s.id] })),
  });
});

const subUnitPayments = asyncHandler(async (req, res) => {
  const unitId = req.user.unit_id;
  if (!unitId) return res.error('No unit is assigned to your account', 400);

  const subUnitId = Number(req.params.id);
  if (!Number.isInteger(subUnitId) || subUnitId <= 0) {
    return res.error('sub-unit id must be a positive integer', 400);
  }

  const subUnit = await db('sub_units').where('id', subUnitId).first();
  if (!subUnit || subUnit.unit_id !== unitId) {
    return res.error('Sub-Unit not found in your unit', 404);
  }

  const payments = await db('payments')
    .join('member_contributions', 'member_contributions.id', 'payments.member_contribution_id')
    .join('members', 'members.id', 'member_contributions.member_id')
    .join('contribution_periods', 'contribution_periods.id', 'member_contributions.contribution_period_id')
    .leftJoin('receipts', 'receipts.payment_id', 'payments.id')
    .where('members.sub_unit_id', subUnitId)
    .orderBy('payments.created_at', 'desc')
    .orderBy('payments.id', 'desc')
    .select(
      'payments.id',
      'payments.amount',
      'payments.method',
      'payments.status',
      'payments.created_at',
      'members.name as member_name',
      'members.member_code',
      'contribution_periods.month',
      'contribution_periods.year',
      'receipts.receipt_number'
    );

  return res.success({
    sub_unit: { id: subUnit.id, name: subUnit.name, serial_number: subUnit.serial_number },
    payments,
  });
});

// ---------- Account Officer unit view ----------
// Account Officers see every unit within their own zone (e.g. all units in
// "Abuja Zone"), so they can review payment records across the zone.

const unitOverview = asyncHandler(async (req, res) => {
  const unitId = req.user.unit_id;
  if (!unitId) return res.error('No unit is assigned to your account', 400);

  const myUnit = await db('units').where('id', unitId).first();
  if (!myUnit) return res.error('Unit not found', 404);

  const zone = await db('zones').where('id', myUnit.zone_id).first();
  const units = await db('units')
    .where('zone_id', myUnit.zone_id)
    .orderBy('units.name')
    .select('units.id', 'units.name', 'units.serial_number');

  const stats = {};
  units.forEach((u) => {
    stats[u.id] = { members: 0, collected: 0, outstanding: 0, paid_payments: 0 };
  });

  const ids = units.map((u) => u.id);
  if (ids.length) {
    const [memberRows, collectedRows, outstandingRows] = await Promise.all([
      db('members')
        .join('sub_units', 'sub_units.id', 'members.sub_unit_id')
        .whereIn('sub_units.unit_id', ids)
        .groupBy('sub_units.unit_id')
        .select('sub_units.unit_id')
        .count({ value: 'members.id' }),
      db('payments')
        .join('member_contributions', 'member_contributions.id', 'payments.member_contribution_id')
        .join('members', 'members.id', 'member_contributions.member_id')
        .join('sub_units', 'sub_units.id', 'members.sub_unit_id')
        .whereIn('sub_units.unit_id', ids)
        .where('payments.status', 'SUCCESS')
        .groupBy('sub_units.unit_id')
        .select('sub_units.unit_id')
        .sum({ total: 'payments.amount' })
        .count({ count: 'payments.id' }),
      db('member_contributions')
        .join('members', 'members.id', 'member_contributions.member_id')
        .join('sub_units', 'sub_units.id', 'members.sub_unit_id')
        .whereIn('sub_units.unit_id', ids)
        .where('member_contributions.status', 'UNPAID')
        .groupBy('sub_units.unit_id')
        .select('sub_units.unit_id')
        .sum({ total: 'member_contributions.expected_amount' }),
    ]);

    memberRows.forEach((r) => {
      if (stats[r.unit_id]) stats[r.unit_id].members = Number(r.value) || 0;
    });
    collectedRows.forEach((r) => {
      if (stats[r.unit_id]) {
        stats[r.unit_id].collected = Number(r.total) || 0;
        stats[r.unit_id].paid_payments = Number(r.count) || 0;
      }
    });
    outstandingRows.forEach((r) => {
      if (stats[r.unit_id]) stats[r.unit_id].outstanding = Number(r.total) || 0;
    });
  }

  const totals = units.reduce(
    (acc, u) => {
      const st = stats[u.id];
      acc.members += st.members;
      acc.collected += st.collected;
      acc.outstanding += st.outstanding;
      acc.paid_payments += st.paid_payments;
      return acc;
    },
    { members: 0, collected: 0, outstanding: 0, paid_payments: 0 }
  );

  return res.success({
    zone: { id: zone ? zone.id : myUnit.zone_id, name: zone ? zone.name : null },
    my_unit_id: myUnit.id,
    totals,
    units: units.map((u) => ({ ...u, ...stats[u.id] })),
  });
});

const unitPayments = asyncHandler(async (req, res) => {
  const reqUnitId = req.user.unit_id;
  if (!reqUnitId) return res.error('No unit is assigned to your account', 400);

  const myUnit = await db('units').where('id', reqUnitId).first();
  if (!myUnit) return res.error('Unit not found', 404);

  const unitId = Number(req.params.id);
  if (!Number.isInteger(unitId) || unitId <= 0) {
    return res.error('unit id must be a positive integer', 400);
  }

  const unit = await db('units').where('id', unitId).first();
  if (!unit || unit.zone_id !== myUnit.zone_id) {
    return res.error('Unit not found in your zone', 404);
  }

  const payments = await db('payments')
    .join('member_contributions', 'member_contributions.id', 'payments.member_contribution_id')
    .join('members', 'members.id', 'member_contributions.member_id')
    .join('sub_units', 'sub_units.id', 'members.sub_unit_id')
    .join('contribution_periods', 'contribution_periods.id', 'member_contributions.contribution_period_id')
    .leftJoin('receipts', 'receipts.payment_id', 'payments.id')
    .where('sub_units.unit_id', unitId)
    .orderBy('payments.created_at', 'desc')
    .orderBy('payments.id', 'desc')
    .select(
      'payments.id',
      'payments.amount',
      'payments.method',
      'payments.status',
      'payments.created_at',
      'members.name as member_name',
      'members.member_code',
      'sub_units.name as sub_unit_name',
      'contribution_periods.month',
      'contribution_periods.year',
      'receipts.receipt_number'
    );

  return res.success({
    unit: { id: unit.id, name: unit.name, serial_number: unit.serial_number },
    payments,
  });
});

module.exports = {
  createZone,
  listZones,
  getZone,
  updateZone,
  createUnit,
  listUnits,
  getUnit,
  updateUnit,
  createSubUnit,
  listSubUnits,
  getSubUnit,
  updateSubUnit,
  subUnitOverview,
  subUnitPayments,
  unitOverview,
  unitPayments,
};