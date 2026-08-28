const db = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');

// ---------- Zones ----------

const createZone = asyncHandler(async (req, res) => {
  const { serial_number, name } = req.body;
  if (!serial_number || !name) {
    return res.error('serial_number and name are required', 400);
  }

  try {
    const [id] = await db('zones').insert({ serial_number, name });
    return res.created({ id, serial_number, name }, 'Zone created');
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.error('A zone with this serial number already exists', 409);
    }
    throw err;
  }
});

const listZones = asyncHandler(async (req, res) => {
  const zones = await req.scope.query(
    db('zones').select('zones.*').orderBy('zones.name'),
    'zones'
  );
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
    return res.created({ id, zone_id, serial_number, name }, 'Unit created');
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.error('A unit with this serial number already exists', 409);
    }
    throw err;
  }
});

const listUnits = asyncHandler(async (req, res) => {
  const units = await req.scope.query(
    db('units').select('units.*').orderBy('units.name'),
    'units'
  );
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
    return res.created({ id, unit_id, serial_number, name }, 'Sub-Unit created');
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.error('A sub-unit with this serial number already exists', 409);
    }
    throw err;
  }
});

const listSubUnits = asyncHandler(async (req, res) => {
  const subUnits = await req.scope.query(
    db('sub_units').select('sub_units.*').orderBy('sub_units.name'),
    'sub_units'
  );
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
  const subUnit = await db('sub_units').where('id', id).first();
  return res.success(subUnit, 'Sub-Unit updated');
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
};