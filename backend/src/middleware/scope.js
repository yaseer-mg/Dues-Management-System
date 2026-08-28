function scopeMiddleware(req, res, next) {
  const user = req.user || {};

  const scope = (table) => {
    const conditions = [];

    switch (table) {
      case 'zones': {
        if (user.zone_id) conditions.push({ type: 'eq', column: 'zones.id', value: user.zone_id });
        break;
      }
      case 'units': {
        if (user.unit_id) {
          conditions.push({ type: 'eq', column: 'units.id', value: user.unit_id });
        } else if (user.zone_id) {
          conditions.push({ type: 'eq', column: 'units.zone_id', value: user.zone_id });
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
      } else if (cond.type === 'whereInSubquery') {
        query.whereIn(cond.column, function () {
          const sub = this.select(cond.subColumn).from(cond.table).where(cond.where);
          if (cond.whereIn) {
            sub.whereIn(cond.whereIn.column, function () {
              this.select(cond.whereIn.subColumn).from(cond.whereIn.table).where(cond.whereIn.where);
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
  };
  next();
}

module.exports = { scopeMiddleware };