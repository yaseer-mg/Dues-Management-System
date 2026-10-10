const asyncHandler = require('../utils/asyncHandler');
const {
  FILES,
  colDefs,
  getMembersReport,
  getContributionsReport,
  getPaymentsReport,
  toCSV,
  toXLSX,
  toPDF,
} = require('../services/reportService');

const FORMATS = ['csv', 'xlsx', 'pdf'];

function parseFilters(query) {
  const num = (v) => (v == null || v === '' ? undefined : Number(v));
  return {
    region_id: num(query.region_id),
    zone_id: num(query.zone_id),
    unit_id: num(query.unit_id),
    sub_unit_id: num(query.sub_unit_id),
    period_id: num(query.period_id),
    status: query.status || undefined,
  };
}

async function buildReport({ scope, kind, format, title, filters = {} }) {
  let rows;
  if (kind === 'members') rows = await getMembersReport(scope, filters);
  else if (kind === 'contributions') rows = await getContributionsReport(scope, filters);
  else rows = await getPaymentsReport(scope, filters);

  const columns = colDefs[kind];
  const tpl = (buffer, ext) => ({
    buffer,
    contentType: {
      csv: 'text/csv; charset=utf-8',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      pdf: 'application/pdf',
    }[format],
    filename: `${FILES[kind].basename}.${ext}`,
  });

  if (format === 'csv') {
    return tpl(toCSV(columns, rows), 'csv');
  }
  if (format === 'xlsx') {
    return tpl(toXLSX(columns, rows), 'xlsx');
  }
  const subtitle = `Generated ${new Date().toLocaleString()} · role-scoped`;
  return tpl(await toPDF({ title, subtitle, columns, rows }), 'pdf');
}

const members = asyncHandler(async (req, res) => {
  const format = (req.query.format || 'csv').toLowerCase();
  if (!FORMATS.includes(format)) return res.error(`format must be one of: ${FORMATS.join(', ')}`, 400);

  const file = await buildReport({
    scope: req.scope,
    kind: 'members',
    format,
    title: 'Membership Report',
    filters: parseFilters(req.query),
  });
  res.setHeader('Content-Type', file.contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
  return res.send(file.buffer);
});

const contributions = asyncHandler(async (req, res) => {
  const format = (req.query.format || 'csv').toLowerCase();
  if (!FORMATS.includes(format)) return res.error(`format must be one of: ${FORMATS.join(', ')}`, 400);
  const file = await buildReport({
    scope: req.scope,
    kind: 'contributions',
    format,
    title: 'Contributions / Dues Collection Report',
    filters: parseFilters(req.query),
  });
  res.setHeader('Content-Type', file.contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
  return res.send(file.buffer);
});

const payments = asyncHandler(async (req, res) => {
  const format = (req.query.format || 'csv').toLowerCase();
  if (!FORMATS.includes(format)) return res.error(`format must be one of: ${FORMATS.join(', ')}`, 400);
  const file = await buildReport({
    scope: req.scope,
    kind: 'payments',
    format,
    title: 'Payments / Financial Report',
    filters: parseFilters(req.query),
  });
  res.setHeader('Content-Type', file.contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
  return res.send(file.buffer);
});

module.exports = { members, contributions, payments };