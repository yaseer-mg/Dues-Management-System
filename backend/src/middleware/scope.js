const db = require('../config/database');

// Region ids under the current user's region (zones, units, sub-units).
async function loadRegionIds(regionId) {
  const zoneIds = await db('zones').where({ region_id: regionId }).pluck('id');
  const unitIds = await db('units').whereIn('zone_id', zoneIds).pluck('id');
  const subUnitIds = await db('sub_units').whereIn('unit_id', unitIds).pluck('id');
  return { zoneIds, unitIds, subUnitIds };
}

async function scopeMiddleware(req, res, next) {
  try {
    const user = req.user || {};

    if (user.region_id) {
      user._region = await loadRegionIds(user.region_id);
    }

    const scope = (table) => {
      const conditions = [];

      switch (table) {
        case 'regions': {
          if (user.region_id) conditions.push({ type: 'eq', column: 'regions.id', value: user.region_id });
          break;
        }
        case 'zones': {
          if (user.zone_id) {
            conditions.push({ type: 'eq', column: 'zones.id', value: user.zone_id });
          } else if (user.region_id) {
            conditions.push({ type: 'whereIn', column: 'zones.id', values: user._region.zoneIds });
          }
          break;
        }
        case 'units': {
          if (user.unit_id) {
            conditions.push({ type: 'eq', column: 'units.id', value: user.unit_id });
          } else if (user.zone_id) {
            conditions.push({ type: 'eq', column: 'units.zone_id', value: user.zone_id });
          } else if (user.region_id) {
            conditions.push({ type: 'whereIn', column: 'units.id', values: user._region.unitIds });
          }
          break;
        }
        case 'sub_units': {
          if (user.sub_unit_id) {
            conditions.push({ type: 'eq', column: 'sub_units.id', value: user.sub_unit_id });
          } else if (user.unit_id) {
            conditions.push({ type: 'eq', column: 'sub_units.unit_id', value: user.unit_id });
          } else if (user.zone_id) {
            conditions.push({
              type: 'whereInSubquery',
              column: 'sub_units.unit_id',
              table: 'units',
              subColumn: 'id',
              where: { zone_id: user.zone_id },
            });
          } else if (user.region_id) {
            conditions.push({ type: 'whereIn', column: 'sub_units.id', values: user._region.subUnitIds });
          }
          break;
        }
        case 'users': {
          if (user.sub_unit_id) {
            conditions.push({ type: 'eq', column: 'users.sub_unit_id', value: user.sub_unit_id });
          } else if (user.unit_id) {
            conditions.push({ type: 'eq', column: 'users.unit_id', value: user.unit_id });
          } else if (user.zone_id) {
            conditions.push({ type: 'eq', column: 'users.zone_id', value: user.zone_id });
          } else if (user.region_id) {
            conditions.push({
              type: 'group',
              group: (b) =>
                b
                  .where('users.region_id', user.region_id)
                  .orWhereIn('users.zone_id', user._region.zoneIds)
                  .orWhereIn('users.unit_id', user._region.unitIds)
                  .orWhereIn('users.sub_unit_id', user._region.subUnitIds),
            });
          }
          break;
        }
        case 'members': {
          if (user.sub_unit_id) {
            conditions.push({ type: 'eq', column: 'members.sub_unit_id', value: user.sub_unit_id });
          } else if (user.unit_id) {
            conditions.push({
              type: 'whereInSubquery',
              column: 'members.sub_unit_id',
              table: 'sub_units',
              subColumn: 'id',
              where: { unit_id: user.unit_id },
            });
          } else if (user.zone_id) {
            conditions.push({
              type: 'whereInSubquery',
              column: 'members.sub_unit_id',
              table: 'sub_units',
              subColumn: 'id',
              whereIn: { column: 'unit_id', table: 'units', subColumn: 'id', where: { zone_id: user.zone_id } },
            });
          } else if (user.region_id) {
            conditions.push({ type: 'whereIn', column: 'members.sub_unit_id', values: user._region.subUnitIds });
          }
          break;
        }
        default:
          break;
      }

      return conditions;
    };

    const applyTo = (query, conditions) => {
      conditions.forEach((cond) => {
        if (cond.type === 'eq') {
          query.where(cond.column, cond.value);
        } else if (cond.type === 'whereIn') {
          query.whereIn(cond.column, cond.values);
        } else if (cond.type === 'orWhereIn') {
          query.orWhereIn(cond.column, cond.values);
        } else if (cond.type === 'orWhere') {
          query.orWhere(cond.column, cond.value);
        } else if (cond.type === 'group') {
          query.where(cond.group);
        } else if (cond.type === 'whereInSubquery') {
          query.whereIn(cond.column, function () {
            const sub = this.select(cond.subColumn).from(cond.table);
            if (cond.where && Object.keys(cond.where).length) sub.where(cond.where);
            if (cond.whereIn) {
              sub.whereIn(cond.whereIn.column, function () {
                const inner = this.select(cond.whereIn.subColumn).from(cond.whereIn.table);
                if (cond.whereIn.where && Object.keys(cond.whereIn.where).length) inner.where(cond.whereIn.where);
              });
            }
          });
        }
      });
      return query;
    };

    const applyScope = (query, table) => applyTo(query, scope(table));
    const applyUserScope = (query) => applyTo(query, scope('users'));

    req.scope = {
      query: applyScope,
      user: applyUserScope,
      isCentral: () => user.role === 'Central Management',
      isRegion: () => !!user.region_id,
      isZone: () => !!user.zone_id,
      isUnit: () => !!user.unit_id,
      isSubUnit: () => !!user.sub_unit_id,
      region: user._region,
    };
    next();
  } catch (err) {
    return next(err);
  }
}

module.exports = { scopeMiddleware };