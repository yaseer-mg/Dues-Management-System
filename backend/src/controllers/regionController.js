const db = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');
const { logAudit } = require('../services/auditService');
const { hashPassword } = require('../utils/password');
const { getRegionSummary } = require('../services/regionSummaryService');

const onlyRbac = (req, res) => {
  if (req.user.role !== 'Central Management') {
    res.error('Forbidden', 403);
    return false;
  }
  return true;
};

const summary = asyncHandler(async (req, res) => {
  const data = await getRegionSummary({ scope: req.scope });
  return res.success(data, 'Region summary');
});

const listRegions = asyncHandler(async (req, res) => {
  const regions = await req.scope.query(
    db('regions')
      .leftJoin('users', 'users.id', 'regions.coordinator_id')
      .leftJoin('zones', 'zones.region_id', 'regions.id')
      .select('regions.*', 'users.name as coordinator_name', 'users.phone as coordinator_phone')
      .count('zones.id as zone_count')
      .groupBy('regions.id')
      .orderBy('regions.name'),
    'regions'
  );
  return res.success(regions);
});

const createRegion = asyncHandler(async (req, res) => {
  if (!onlyRbac(req, res)) return;
  const { name, serial_number } = req.body;
  if (!name || !serial_number) {
    return res.error('name and serial_number are required', 400);
  }
  try {
    const [id] = await db('regions').insert({ name, serial_number });
    await logAudit({
      trx: db,
      user_id: req.user.user_id,
      action: 'REGION_CREATED',
      entity: 'region',
      entity_id: id,
      metadata: { name, serial_number },
    });
    return res.created({ id, name, serial_number }, 'Region created');
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.error('A region with this serial number already exists', 409);
    }
    throw err;
  }
});

const updateRegion = asyncHandler(async (req, res) => {
  if (!onlyRbac(req, res)) return;
  const { id } = req.params;
  const { name, serial_number, coordinator_id } = req.body;

  const exists = await db('regions').where('id', id).first();
  if (!exists) return res.error('Region not found', 404);

  const updates = {};
  if (name !== undefined) updates.name = name;
  if (serial_number !== undefined) updates.serial_number = serial_number;
  if (coordinator_id !== undefined) updates.coordinator_id = coordinator_id;

  if (Object.keys(updates).length === 0) {
    return res.error('Nothing to update', 400);
  }

  if (updates.coordinator_id) {
    await db('users').where('id', updates.coordinator_id).update({ region_id: Number(id) });
  }

  await db('regions').where('id', id).update(updates);
  await logAudit({
    trx: db,
    user_id: req.user.user_id,
    action: 'REGION_UPDATED',
    entity: 'region',
    entity_id: Number(id),
    metadata: { changes: updates },
  });
  const region = await db('regions').where('id', id).first();
  return res.success(region, 'Region updated');
});

const setCoordinator = asyncHandler(async (req, res) => {
  if (!onlyRbac(req, res)) return;
  const { id } = req.params;
  const { name, phone } = req.body;
  if (!name || !phone) {
    return res.error('name and phone are required', 400);
  }

  const region = await db('regions').where('id', id).first();
  if (!region) return res.error('Region not found', 404);

  const existing = await db('users').where('phone', phone).first();
  if (existing) {
    // Re-assign an existing account as this region's coordinator.
    await db('users').where('id', existing.id).update({ region_id: Number(id), role_id: 6 });
    await db('regions').where('id', id).update({ coordinator_id: existing.id });
    await logAudit({
      trx: db,
      user_id: req.user.user_id,
      action: 'REGION_COORDINATOR_UPDATED',
      entity: 'region',
      entity_id: Number(id),
      metadata: { coordinator_user_id: existing.id, phone },
    });
    return res.success({ id: existing.id, name, phone, region_id: id }, 'Coordinator assigned');
  }

  const role = await db('roles').where('name', 'Region Management').first();
  const password_hash = await hashPassword('password123');
  const [userId] = await db('users').insert({
    name,
    phone,
    role_id: role.id,
    region_id: Number(id),
    password_hash,
    status: 'ACTIVE',
  });
  await db('regions').where('id', id).update({ coordinator_id: userId });

  await logAudit({
    trx: db,
    user_id: req.user.user_id,
    action: 'REGION_COORDINATOR_CREATED',
    entity: 'region',
    entity_id: Number(id),
    metadata: { coordinator_user_id: userId, name, phone },
  });

  return res.created(
    { id: userId, name, phone, region_id: id, role: 'Region Management', password: 'password123' },
    'Coordinator created'
  );
});

const assignZone = asyncHandler(async (req, res) => {
  if (!onlyRbac(req, res)) return;
  const { id } = req.params;
  const { zone_id } = req.body;
  if (!zone_id || !Number.isInteger(Number(zone_id)) || Number(zone_id) <= 0) {
    return res.error('zone_id must be a positive integer', 400);
  }

  const region = await db('regions').where('id', id).first();
  if (!region) return res.error('Region not found', 404);
  const zone = await db('zones').where('id', zone_id).first();
  if (!zone) return res.error('Zone not found', 404);

  await db('zones').where('id', zone_id).update({ region_id: Number(id) });
  await logAudit({
    trx: db,
    user_id: req.user.user_id,
    action: 'ZONE_ASSIGNED_TO_REGION',
    entity: 'region',
    entity_id: Number(id),
    metadata: { zone_id: Number(zone_id), zone_name: zone.name },
  });
  return res.success({ zone_id: Number(zone_id), region_id: Number(id) }, 'Zone assigned to region');
});

module.exports = { summary, listRegions, createRegion, updateRegion, setCoordinator, assignZone };