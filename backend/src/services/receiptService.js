const crypto = require('crypto');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const db = require('../config/database');
const { sendReceiptNotification } = require('./notificationService');

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

// Best-effort receipt link delivery after the payment transaction commits.
async function notifyReceipt({ phone, memberName, receipt }) {
  return sendReceiptNotification({
    phone,
    memberName,
    receiptNumber: receipt.receipt_number,
    verificationUrl: verificationUrl(receipt.verification_code),
  });
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
  const amount = `NGN ${Number(payment.amount).toLocaleString()}`;
  const month = new Date(0, period.month - 1).toLocaleString('en-US', { month: 'long' });
  const qrUrl = verificationUrl(r.verification_code);
  const qrDataUrl = await QRCode.toDataURL(qrUrl, { margin: 1, width: 220 });

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A5', margin: 40 });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const LEFT = 40;
    const RIGHT = doc.page.width - 40;
    const innerW = RIGHT - LEFT;

    // Header band
    doc.rect(0, 0, doc.page.width, 66).fill('#065f46');
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(15)
      .text('Centralized Dues Management', LEFT, 18, { width: innerW, align: 'center' });
    doc.font('Helvetica').fontSize(9).fillColor('#d1fae5')
      .text('OFFICIAL PAYMENT RECEIPT', LEFT, 40, { width: innerW, align: 'center' });

    // Meta line
    let y = 86;
    doc.font('Helvetica').fontSize(8).fillColor('#6b7280');
    doc.text(`Receipt No: ${r.receipt_number}`, LEFT, y, { width: innerW - 70 });
    doc.text('Status: PAID', LEFT + 70, y, { width: innerW - 70, align: 'right' });
    y += 14;
    doc.text(`Date: ${new Date(payment.created_at || Date.now()).toLocaleString()}`, LEFT, y, { width: innerW });
    y += 14;
    doc.text(`Verification Code: ${r.verification_code}`, LEFT, y, { width: innerW });

    // Details card
    y += 20;
    const rows = [
      ['Member', member.name],
      ['Member Code', member.member_code],
      ['Period', `${month} ${period.year}`],
      ['Method', payment.method],
    ];
    const rowH = 22;
    const cardH = rows.length * rowH;
    doc.roundedRect(LEFT, y, innerW, cardH, 6).fillAndStroke('#f0fdf4', '#d1fae5');
    let ry = y;
    rows.forEach(([label, value], i) => {
      if (i % 2 === 1) {
        doc.rect(LEFT + 1, ry, innerW - 2, rowH).fill('#e7f8ef');
      }
      doc.font('Helvetica').fontSize(9).fillColor('#6b7280').text(label, LEFT + 12, ry + 7, { width: innerW / 2 });
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#111827')
        .text(String(value), LEFT + 12, ry + 7, { width: innerW - 24, align: 'right' });
      ry += rowH;
    });
    y += cardH;

    // Amount highlight
    y += 14;
    doc.roundedRect(LEFT, y, innerW, 40, 6).fill('#065f46');
    doc.font('Helvetica').fontSize(9).fillColor('#d1fae5')
      .text('AMOUNT PAID', LEFT + 14, y + 9, { width: innerW / 2 });
    doc.font('Helvetica-Bold').fontSize(16).fillColor('#ffffff')
      .text(amount, LEFT + 14, y + 8, { width: innerW - 28, align: 'right' });

    // QR + verify hint
    y += 56;
    doc.font('Helvetica').fontSize(8).fillColor('#6b7280')
      .text('Scan to verify this receipt', LEFT, y, { width: innerW, align: 'center' });
    doc.image(qrDataUrl, LEFT + (innerW - 96) / 2, y + 14, { fit: [96, 96] });
    doc.fontSize(7).fillColor('#9ca3af')
      .text('This receipt can be verified publicly using its verification code.', LEFT, y + 116, {
        width: innerW,
        align: 'center',
      });

    doc.end();
  });
}

module.exports = { createReceiptForPayment, generateReceiptPdf, verificationUrl, notifyReceipt };
