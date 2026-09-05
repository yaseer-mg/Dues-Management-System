// Best-effort receipt notification delivery.
//
// Pluggable by env:
//   RECEIPT_NOTIFY_DRIVER  = log (default) | webhook
//   RECEIPT_NOTIFY_WEBHOOK_URL = e.g. a WhatsApp Business / SMS provider
//                                adapter (Twilio, Termii, Meta Cloud API)
//
// Delivery is best-effort: a failure is caught and logged, never thrown, so
// it can never fail the payment that just succeeded.

function currentDriver() {
  return (process.env.RECEIPT_NOTIFY_DRIVER || 'log').toLowerCase();
}

function buildMessage({ memberName, receiptNumber, verificationUrl }) {
  const name = memberName ? `Dear ${memberName}, ` : '';
  return `${name}your payment of this period has been recorded. Receipt ${receiptNumber} — verify here: ${verificationUrl}`;
}

async function postToWebhook(payload) {
  const url = process.env.RECEIPT_NOTIFY_WEBHOOK_URL;
  if (!url) {
    throw new Error('RECEIPT_NOTIFY_WEBHOOK_URL is not configured');
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`webhook responded with status ${res.status}`);
  }
  return { ok: true, channel: 'webhook' };
}

// { phone, memberName, receiptNumber, verificationUrl }
async function sendReceiptNotification({ phone, memberName, receiptNumber, verificationUrl }) {
  const message = buildMessage({ memberName, receiptNumber, verificationUrl });

  try {
    switch (currentDriver()) {
      case 'webhook': {
        return await postToWebhook({
          channel: 'whatsapp',
          to: phone,
          message,
          template: 'receipt_ready',
          receipt_number: receiptNumber,
          verification_url: verificationUrl,
        });
      }
      case 'off':
        return { ok: true, skipped: 'off' };
      default: {
        console.log(`[notify:log] ${message} -> ${phone}`);
        return { ok: true, channel: 'log' };
      }
    }
  } catch (err) {
    console.error(`[notify] delivery failed for ${phone} (${receiptNumber}):`, err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = { sendReceiptNotification, currentDriver };