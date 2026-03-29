const Bill = require('../models/Bill');
const { enqueueBillWhatsappDelivery } = require('../services/billWorkflowService');
const { isValidIndianWhatsAppNumber } = require('../services/twilioService');

const normalizeItems = (items = []) => {
  if (!Array.isArray(items)) return [];

  return items.map((item, index) => {
    const quantity = Number(item?.quantity) || 1;
    const price = Number(item?.price) || 0;
    const explicitAmount = Number(item?.amount);
    const amount = Number.isFinite(explicitAmount) ? explicitAmount : quantity * price;

    return {
      name: String(item?.name || `Item ${index + 1}`).trim() || `Item ${index + 1}`,
      quantity,
      price,
      amount,
    };
  });
};

const createBill = async (req, res) => {
  try {
    const customerName = String(req.body.customerName || '').trim();
    const phoneNumber = String(req.body.phoneNumber || '').trim();
    const billAmount = Number(req.body.billAmount);
    const items = normalizeItems(req.body.items);

    if (!customerName) {
      return res.status(400).json({ message: 'customerName is required' });
    }

    if (!isValidIndianWhatsAppNumber(phoneNumber)) {
      return res.status(400).json({ message: 'phoneNumber must be in +91XXXXXXXXXX format' });
    }

    if (!Number.isFinite(billAmount) || billAmount < 0) {
      return res.status(400).json({ message: 'billAmount must be a valid non-negative number' });
    }

    const bill = await Bill.create({
      customerName,
      phoneNumber,
      billAmount,
      items,
      whatsappStatus: 'pending',
    });

    enqueueBillWhatsappDelivery(bill._id.toString());

    return res.status(201).json({
      message: 'Bill created successfully. PDF generation and WhatsApp delivery started in background.',
      bill,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to create bill',
      error: error.message,
    });
  }
};

const getBills = async (_req, res) => {
  try {
    const bills = await Bill.find().sort({ createdAt: -1 });
    return res.json(bills);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch bills', error: error.message });
  }
};

const getBillById = async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id);
    if (!bill) {
      return res.status(404).json({ message: 'Bill not found' });
    }

    return res.json(bill);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch bill', error: error.message });
  }
};

const handleWhatsAppStatusWebhook = async (req, res) => {
  try {
    const messageSid = String(req.body.MessageSid || req.body.SmsSid || '').trim();
    const messageStatus = String(req.body.MessageStatus || req.body.SmsStatus || '').trim().toLowerCase();
    const errorCode = String(req.body.ErrorCode || '').trim();
    const errorMessage = String(req.body.ErrorMessage || '').trim();

    if (!messageSid) {
      return res.status(200).send('ignored');
    }

    const statusMap = {
      queued: 'pending',
      accepted: 'pending',
      sending: 'pending',
      sent: 'sent',
      delivered: 'sent',
      read: 'sent',
      failed: 'failed',
      undelivered: 'failed',
    };

    const mappedStatus = statusMap[messageStatus];
    const update = {
      whatsappError: errorCode || errorMessage || '',
    };

    if (mappedStatus) {
      update.whatsappStatus = mappedStatus;
    }

    if (mappedStatus === 'sent') {
      update.sentAt = new Date();
    }

    await Bill.findOneAndUpdate({ whatsappMessageSid: messageSid }, { $set: update });
    return res.status(200).send('ok');
  } catch (error) {
    console.error('Failed to process Twilio status callback:', error.message);
    return res.status(200).send('error');
  }
};

module.exports = {
  createBill,
  getBills,
  getBillById,
  handleWhatsAppStatusWebhook,
};
