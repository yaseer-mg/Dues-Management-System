const PDFDocument = require('pdfkit');
const XLSX = require('xlsx');
const db = require('../config/database');

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// ---------- data ----------

async function getMembersReport(scope) {
  const q = db('members')
    .leftJoin('sub_units', 'sub_units.id', 'members.sub_unit_id')
    .leftJoin('units', 'units.id', 'sub_units.unit_id')
    .leftJoin('zones', 'zones.id', 'units.zone_id')
    .leftJoin('contribution_categories', 'contribution_categories.id', 'members.contribution_category_id')
    .orderBy('members.member_code')
    .select(
      'members.member_code',
      'members.name',
      'members.phone',
      'members.gender',
      'members.status',
      'zones.name as zone',
      'units.name as unit',
      'sub_units.name as sub_unit',
      'contribution_categories.name as category',
      'contribution_categories.amount as monthly_dues'
    );
  scope.query(q, 'members');
  return q;
}

async function getContributionsReport(scope) {
  const q = db('member_contributions as mc')
    .join('members', 'members.id', 'mc.member_id')
    .join('contribution_periods as cp', 'cp.id', 'mc.contribution_period_id')
    .leftJoin('payments as p', 'p.member_contribution_id', 'mc.id')
    .leftJoin('receipts as r', 'r.payment_id', 'p.id')
    .orderBy('members.member_code')
    .select(
      'members.member_code',
      'members.name as member_name',
      'cp.month',
      'cp.year',
      'cp.status as period_status',
      'mc.expected_amount',
      'mc.status as status',
      'mc.paid_at',
      'p.method',
      'p.status as payment_status',
      'r.receipt_number'
    );
  scope.query(q, 'members');
  const rows = await q;
  return rows.map((r) => ({
    ...r,
    period: `${MONTH_NAMES[r.month - 1]} ${r.year}`,
  }));
}

async function getPaymentsReport(scope) {
  const q = db('payments as p')
    .join('member_contributions as mc', 'mc.id', 'p.member_contribution_id')
    .join('members', 'members.id', 'mc.member_id')
    .leftJoin('users as ru', 'ru.id', 'p.recorded_by')
    .leftJoin('users as fu', 'fu.id', 'p.refunded_by')
    .leftJoin('receipts as r', 'r.payment_id', 'p.id')
    .orderBy('p.created_at', 'desc')
    .select(
      'p.id',
      'members.member_code',
      'members.name as member_name',
      'p.amount',
      'p.method',
      'p.status',
      'r.receipt_number',
      'ru.name as recorded_by',
      'fu.name as refunded_by',
      'p.created_at'
    );
  scope.query(q, 'members');
  return q;
}

// ---------- rendering ----------

const colDefs = {
  members: [
    { key: 'member_code', title: 'Member Code', width: 80 },
    { key: 'name', title: 'Name', width: 130 },
    { key: 'phone', title: 'Phone', width: 90 },
    { key: 'gender', title: 'Gender', width: 55 },
    { key: 'status', title: 'Status', width: 60 },
    { key: 'zone', title: 'Zone', width: 90 },
    { key: 'unit', title: 'Unit', width: 90 },
    { key: 'sub_unit', title: 'Sub-Unit', width: 90 },
    { key: 'category', title: 'Category', width: 110 },
    { key: 'monthly_dues', title: 'Monthly Dues', width: 90, money: true },
  ],
  contributions: [
    { key: 'member_code', title: 'Member Code', width: 80 },
    { key: 'member_name', title: 'Member', width: 130 },
    { key: 'period', title: 'Period', width: 100 },
    { key: 'period_status', title: 'Period Status', width: 80 },
    { key: 'expected_amount', title: 'Expected', width: 80, money: true },
    { key: 'status', title: 'Status', width: 65 },
    { key: 'paid_at', title: 'Paid At', width: 110, date: true },
    { key: 'method', title: 'Method', width: 60 },
    { key: 'payment_status', title: 'Payment Status', width: 85 },
    { key: 'receipt_number', title: 'Receipt', width: 90 },
  ],
  payments: [
    { key: 'id', title: 'ID', width: 40 },
    { key: 'member_code', title: 'Member Code', width: 80 },
    { key: 'member_name', title: 'Member', width: 130 },
    { key: 'amount', title: 'Amount', width: 80, money: true },
    { key: 'method', title: 'Method', width: 60 },
    { key: 'status', title: 'Status', width: 75 },
    { key: 'receipt_number', title: 'Receipt', width: 90 },
    { key: 'recorded_by', title: 'Recorded By', width: 100 },
    { key: 'refunded_by', title: 'Refunded By', width: 100 },
    { key: 'created_at', title: 'Date', width: 110, date: true },
  ],
};

const FILES = {
  members: { basename: 'members-report' },
  contributions: { basename: 'contributions-report' },
  payments: { basename: 'payments-report' },
};

// Guards against CSV/Excel formula injection (cells starting with =, +, -, @).
function sanitizeCell(value) {
  const s = String(value);
  if (/^[=+\-@\t\r]/.test(s)) return `'${s}`;
  return s;
}

function toCSV(columns, rows) {
  const lines = [columns.map((c) => sanitizeCell(c.title)).join(',')];
  rows.forEach((row) => {
    lines.push(
      columns
        .map((c) => {
          const v = row[c.key] == null ? '' : String(row[c.key]);
          return `"${sanitizeCell(v).replace(/"/g, '""')}"`;
        })
        .join(',')
    );
  });
  return Buffer.from('\uFEFF' + lines.join('\r\n'), 'utf8');
}

function toXLSX(columns, rows) {
  const aoa = [columns.map((c) => c.title)];
  rows.forEach((row) => {
    aoa.push(columns.map((c) => (row[c.key] == null ? '' : row[c.key])));
  });
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  XLSX.utils.book_append_sheet(wb, ws, 'Report');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

// Limit PDF rows to the most recent entries to keep files sane.
const PDF_MAX_ROWS = 500;

function displayValue(col, value) {
  if (value == null || value === '') return '—';
  if (col.money) return `₦${Number(value).toLocaleString()}`;
  if (col.date) return new Date(value).toLocaleString();
  return String(value);
}

function truncate(text, width) {
  const approx = Math.max(3, Math.floor(width / 1.6));
  return text.length > approx ? `${text.slice(0, approx - 1)}…` : text;
}

function toPDF({ title, subtitle, columns, rows }) {
  const data = rows.slice(0, PDF_MAX_ROWS);
  const totalWidth = columns.reduce((a, c) => a + (c.width || 80), 0);
  const doc = new PDFDocument({
    size: 'A4',
    layout: totalWidth > 530 ? 'landscape' : 'portrait',
    margin: 30,
  });
  const chunks = [];
  doc.on('data', (c) => chunks.push(c));

  const available = doc.page.width - 60;
  const colWidths = columns.map((c, i) => {
    const style = c.width || Math.floor(available / columns.length);
    return i === columns.length - 1 ? available - colSum(i) : style;
  });
  function colSum(i) {
    return columns
      .slice(0, i)
      .reduce((a, c) => a + (c.width || Math.floor(available / columns.length)), 0);
  }

  const drawHeader = () => {
    let x = 30;
    const y = doc.y;
    columns.forEach((c, i) => {
      doc.rect(x, y, colWidths[i], 18).fill('#047857');
      doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(8);
      doc.text(c.title.slice(0, 40), x + 3, y + 5, { width: colWidths[i] - 6 });
      x += colWidths[i];
    });
    doc.y = y + 18;
  };

  doc.fontSize(15).font('Helvetica-Bold').fillColor('#065f46').text(title, { width: doc.page.width - 60 });
  if (subtitle) {
    doc.fontSize(9).font('Helvetica').fillColor('#666666').text(subtitle, { width: doc.page.width - 60 });
  }
  doc.moveDown(0.6);
  drawHeader();

  doc.font('Helvetica').fontSize(8).fillColor('#111827');
  const rowH = 14;
  data.forEach((row, idx) => {
    if (doc.y + rowH > doc.page.height - 40) {
      doc.addPage();
      drawHeader();
    }
    let x = 30;
    if (idx % 2 === 0) {
      doc.rect(30, doc.y, available, rowH).fill('#f0fdf4');
    }
    columns.forEach((c, i) => {
      doc.fillColor('#111827');
      doc.text(truncate(displayValue(c, row[c.key]), colWidths[i]), x + 3, doc.y + 3, {
        width: colWidths[i] - 6,
      });
      x += colWidths[i];
    });
    doc.y += rowH;
  });

  if (rows.length > PDF_MAX_ROWS) {
    doc.moveDown(0.5).font('Helvetica').fontSize(8).fillColor('#666666')
      .text(`Showing the ${PDF_MAX_ROWS} most recent records (${rows.length} total). Use CSV/Excel for the full dataset.`);
  }

  doc.end();
  return new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
}

module.exports = {
  FILES,
  colDefs,
  getMembersReport,
  getContributionsReport,
  getPaymentsReport,
  toCSV,
  toXLSX,
  toPDF,
};