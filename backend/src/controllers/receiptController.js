const db = require('../config/database');
const { generateReceiptPdf } = require('../services/receiptService');

// GET /receipts/:payment_id — download a receipt PDF for a SUCCESS payment.
// Scope-restricted: the payment's member must be within the caller's scope.
async function downloadReceipt(req, res) {
  const paymentId = Number(req.params.payment_id);

  if (!Number.isInteger(paymentId) || paymentId <= 0) {
    return res.status(400).json({ success: false, message: 'Invalid payment id' });
  }

  const dbError = (message, status = 500) => {
    console.error(`[receipts] ${message}`);
    return res.status(status).json({ success: false, message });
  };

  let payment;
  try {
    payment = await req.scope.query(
      db('payments')
        .join('member_contributions', 'member_contributions.id', 'payments.member_contribution_id')
        .join('members', 'members.id', 'member_contributions.member_id')
        .where('payments.id', paymentId)
        .first(),
      'members',
    );
  } catch (err) {
    return dbError('Database error while looking up payment', 500);
  }

  if (!payment) return res.status(404).json({ success: false, message: 'Receipt not found' });

  let receipt;
  try {
    receipt = await db('receipts').where('payment_id', paymentId).first();
  } catch (err) {
    return dbError('Database error while looking up receipt', 500);
  }

  if (!receipt) return res.status(404).json({ success: false, message: 'Receipt not found' });

  let pdf;
  try {
    pdf = await generateReceiptPdf(receipt.receipt_number);
  } catch (err) {
    console.error('[receipts] PDF generation failed:', err.message);
    return dbError('Failed to generate receipt PDF', 500);
  }

  if (!pdf) return res.status(404).json({ success: false, message: 'Receipt not found' });

  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="${receipt.receipt_number}.pdf"`,
    'Content-Length': pdf.length,
  });
  return res.send(pdf);
}

module.exports = { downloadReceipt };