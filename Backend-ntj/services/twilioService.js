const twilio = require('twilio');

const getTwilioConfig = () => {
  const accountSid = String(process.env.TWILIO_SID || process.env.TWILIO_ACCOUNT_SID || '').trim();
  const authToken = String(process.env.TWILIO_AUTH_TOKEN || '').trim();
  const from = String(process.env.TWILIO_WHATSAPP_NUMBER || '').trim();
  const baseUrl = String(
    process.env.BASE_URL || process.env.PUBLIC_BASE_URL || process.env.APP_BASE_URL || '',
  )
    .trim()
    .replace(/\/+$/, '');

  return {
    accountSid,
    authToken,
    from,
    baseUrl,
  };
};

const isValidIndianWhatsAppNumber = (phoneNumber = '') => /^\+91\d{10}$/.test(String(phoneNumber).trim());

const normalizeIndianWhatsAppNumber = (phoneNumber = '') => {
  const raw = String(phoneNumber || '').trim();
  const digits = raw.replace(/\D/g, '');

  if (raw.startsWith('+91') && digits.length === 12) {
    return `+${digits}`;
  }

  if (digits.length === 10) {
    return `+91${digits}`;
  }

  if (digits.length === 12 && digits.startsWith('91')) {
    return `+${digits}`;
  }

  return raw;
};

const getTwilioClient = () => {
  const { accountSid, authToken } = getTwilioConfig();
  if (!accountSid || !authToken) {
    throw new Error('Twilio credentials are not configured. Set TWILIO_SID and TWILIO_AUTH_TOKEN.');
  }

  return twilio(accountSid, authToken);
};

const sendWhatsAppBill = async ({ billId, phone, name, amount, pdfUrl }) => {
  const normalizedPhone = normalizeIndianWhatsAppNumber(phone);
  if (!isValidIndianWhatsAppNumber(normalizedPhone)) {
    throw new Error('Invalid customer phone number. Expected +91XXXXXXXXXX.');
  }

  if (!pdfUrl) {
    throw new Error('Bill PDF URL is missing.');
  }

  const { from, baseUrl } = getTwilioConfig();
  if (!from) {
    throw new Error('TWILIO_WHATSAPP_NUMBER is not configured.');
  }

  const client = getTwilioClient();
  const body = `Hello ${String(name || '').trim() || 'Customer'}, your bill of Rs. ${Number(
    amount || 0,
  ).toFixed(2)} is ready.`;

  const messagePayload = {
    from,
    to: `whatsapp:${normalizedPhone}`,
    body,
    mediaUrl: [pdfUrl],
  };

  if (baseUrl && billId) {
    messagePayload.statusCallback = `${baseUrl}/api/bills/whatsapp/status`;
  }

  return client.messages.create(messagePayload);
};

module.exports = {
  getTwilioConfig,
  isValidIndianWhatsAppNumber,
  normalizeIndianWhatsAppNumber,
  sendWhatsAppBill,
};
