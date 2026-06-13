const Bill = require('../models/Bill');
const { generateBillPdf } = require('./pdfService');
const {
  sendWhatsAppBill,
  isValidIndianWhatsAppNumber,
  normalizeIndianWhatsAppNumber,
} = require('./twilioService');

const getRetryConfig = () => ({
  maxRetries: Math.max(1, Number(process.env.BILL_WHATSAPP_MAX_RETRIES || 3)),
  retryDelayMs: Math.max(1000, Number(process.env.BILL_WHATSAPP_RETRY_DELAY_MS || 15000)),
});

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const updateAttemptMetadata = async (billId, attempt) => {
  await Bill.findByIdAndUpdate(billId, {
    $set: { lastWhatsappAttemptAt: new Date() },
    $max: { whatsappAttempts: attempt },
  });
};

const processBillDelivery = async (billId) => {
  const { maxRetries, retryDelayMs } = getRetryConfig();

  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    try {
      await updateAttemptMetadata(billId, attempt);

      let bill = await Bill.findById(billId);
      if (!bill) {
        console.warn(`Bill ${billId} not found for WhatsApp delivery.`);
        return;
      }

      if (!bill.pdfUrl) {
        const pdfDetails = await generateBillPdf(bill);
        bill.pdfUrl = pdfDetails.pdfUrl;
        bill.pdfPath = pdfDetails.filePath;
        await bill.save();
      }

      const twilioMessage = await sendWhatsAppBill({
        billId: bill._id.toString(),
        phone: bill.phoneNumber,
        name: bill.customerName,
        amount: bill.billAmount,
        pdfUrl: bill.pdfUrl,
      });

      bill.whatsappStatus = 'pending';
      bill.whatsappMessageSid = String(twilioMessage.sid || '');
      bill.whatsappError = '';
      bill.sentAt = null;
      bill.whatsappAttempts = attempt;
      await bill.save();

      console.log(
        `Twilio accepted WhatsApp bill request for bill ${bill._id}. Message SID: ${bill.whatsappMessageSid}`,
      );
      return;
    } catch (error) {
      const errorMessage = error?.message || 'Unknown WhatsApp delivery error';

      await Bill.findByIdAndUpdate(billId, {
        $set: {
          whatsappStatus: attempt >= maxRetries ? 'failed' : 'pending',
          whatsappError: errorMessage,
          lastWhatsappAttemptAt: new Date(),
        },
        $max: { whatsappAttempts: attempt },
      });

      console.error(`WhatsApp delivery attempt ${attempt} failed for bill ${billId}: ${errorMessage}`);

      if (attempt < maxRetries) {
        await delay(retryDelayMs);
      }
    }
  }
};

const enqueueBillWhatsappDelivery = (billId) => {
  setImmediate(() => {
    processBillDelivery(billId).catch((error) => {
      console.error(`Unexpected background delivery failure for bill ${billId}:`, error.message);
    });
  });
};

const toNumber = (value, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const pickBillAmount = (billSummary = {}) =>
  toNumber(
    billSummary.billAmount ??
      billSummary.finalAmount ??
      billSummary.finalValue ??
      billSummary.gst?.finalAmount ??
      billSummary.gst?.amount ??
      billSummary.cashAmount,
    0,
  );

const enqueueBillSummaryWhatsappDelivery = async (billSummary) => {
  const phoneNumber = normalizeIndianWhatsAppNumber(
    billSummary?.phoneNumber || billSummary?.phone || billSummary?.customerNumber || '',
  );
  if (!isValidIndianWhatsAppNumber(phoneNumber)) {
    console.warn(
      `Skipping WhatsApp send for bill summary ${billSummary?._id || ''}: invalid or missing phone number.`,
    );
    return null;
  }

  const sourceBillSummaryId = String(billSummary?._id || '').trim();
  if (!sourceBillSummaryId) {
    console.warn('Skipping WhatsApp send because bill summary id is missing.');
    return null;
  }

  const payload = {
    sourceBillSummaryId,
    billNo: String(billSummary.billNo || billSummary.invoiceNo || '').trim(),
    billType: String(billSummary.billType || billSummary.customerType || '').trim(),
    customerName: String(billSummary.customerName || '').trim() || 'Unknown',
    phoneNumber,
    billAmount: pickBillAmount(billSummary),
    items: Array.isArray(billSummary.items) ? billSummary.items : [],
    whatsappStatus: 'pending',
    whatsappError: '',
    sentAt: null,
  };

  const bill = await Bill.findOneAndUpdate(
    { sourceBillSummaryId },
    { $set: payload },
    { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true },
  );

  enqueueBillWhatsappDelivery(bill._id.toString());
  return bill;
};

module.exports = {
  enqueueBillWhatsappDelivery,
  enqueueBillSummaryWhatsappDelivery,
  processBillDelivery,
};
