const crypto = require('crypto');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const db = require('../config/database');

// Creates a receipt row for a SUCCESS payment inside the caller's transaction.
// Called from both the cash and online payment paths the moment a payment
// reaches SUCCESS, guaranteeing one receipt per SUCCESS payment.
async function createReceiptForPayment({ trx, paymentId }) {
  const verificationCode = crypto.randomBytes(12).toString('hex').toUpperCase();
  const tempNumber = `RCP-TMP-${Date.now()}-${verificationCode.slice(0, 6)}`;

  const [id] = await trx('receipts').insert({
    payment_id: paymentId,
    receipt_number: tempNumber,
    verification_code: verificationCode,
  });

  const receiptNumber = `RCP-${String(id).padStart(6, '0')}`;
  await trx('receipts').where('id', id).update({ receipt_number: receiptNumber });

  return {
    id,
    payment_id: paymentId,
    receipt_number: receiptNumber,
    verification_code: verificationCode,
  };
}

// Builds the public verification URL encoded into the QR code.
function verificationUrl(verificationCode) {
  const base = process.env.PAYMENT_BASE_URL || process.env.FRONTEND_URL || 'http://localhost:5173';
  return `${base}/receipt/verify/${verificationCode}`;
}

// Loads full receipt details (payment, member, contribution period, method).
async function loadReceiptDetails(receipt) {
  const payment = await db('payments').where('id', receipt.payment_id).first();
  if (!payment) return null;

  const contribution = await db('member_contributions')
    .where('id', payment.member_contribution_id)
    .first();

  const member = contribution
    ? await db('members').where('id', contribution.member_id).first()
    : null;

  const period = contribution
    ? await db('contribution_periods').where('id', contribution.contribution_period_id).first()
    : null;

  return { receipt, payment, contribution, member, period };
}

// Generates a PDF receipt with details + a QR code linking to the public
// verification page. Returns a Buffer.
async function generateReceiptPdf(receiptNumberOrCode) {
  const receipt = await db('receipts')
    .where(db.raw('(receipts.receipt_number = ? OR receipts.verification_code = ?)', [
      receiptNumberOrCode,
      receiptNumberOrCode.toLowerCase(),
    ]))
    .first();

  const data = receipt ? await loadReceiptDetails(receipt) : null;
  if (!data || !data.member || !data.period) return null;

  const { receipt: r, payment, member, period } = data;
  const amount = `\u20A6${Number(payment.amount).toLocaleString()}`;
  const month = new Date(0, period.month - 1).toLocaleString('en-US', { month: 'long' });
  const qrUrl = verificationUrl(r.verification_code);
  const qrDataUrl = await QRCode.toDataURL(qrUrl, { margin: 1, width: 220 });

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A5', margin: 40 });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header
    doc.fontSize(16).fillColor('#065f46').text('Centralized Dues Management', { align: 'center' });
    doc.moveDown(0.2);
    doc.fontSize(12).fillColor('#111827').text('OFFICIAL PAYMENT RECEIPT', { align: 'center' });
    doc.moveDown(1);

    doc.fontSize(9).fillColor('#6b7280').text(`Receipt No: ${r.receipt_number}`);
    doc.text(`Verification Code: ${r.verification_code}`);
    doc.text(`Date: ${new Date(payment.created_at || Date.now()).toLocaleString()}`);
    doc.moveDown();

    doc.moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y).strokeColor('#d1d5db').stroke();
    doc.moveDown(0.6);

    // Details
    const detail = (label, value) => {
      doc.fontSize(10).fillColor('#374151').text(value, { align: 'right', lineBreak: false });
      doc.fontSize(10).fillColor('#111827').text(label);
    };
    doc.font('Helvetica-Bold');
    detail('Member', member.name);
    detail('Member Code', member.member_code);
    detail('Period', `${month} ${period.year}`);
    detail('Method', payment.method);
    doc.font('Helvetica');
    doc.moveDown(0.5);
    detail('Amount Paid', amount);

    doc.moveDown(1);
    doc.moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y).strokeColor('#d1d5db').stroke();
    doc.moveDown(0.6);

    // QR + verify hint
    doc.fontSize(9).fillColor('#6b7280').text('Scan to verify this receipt', { align: 'center' });
    doc.image(qrDataUrl, { fit: [110, 110], align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(8).fillColor('#9ca3af').text('This receipt can be verified publicly using its verification code.', { align: 'center' });

    doc.end();
  });
}

module.exports = { createReceiptForPayment, generateReceiptPdf, verificationUrl };
