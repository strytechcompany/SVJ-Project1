const mongoose = require('mongoose');

const billItemSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, default: '' },
    quantity: { type: Number, default: 1, min: 0 },
    price: { type: Number, default: 0, min: 0 },
    amount: { type: Number, default: 0, min: 0 },
  },
  { _id: false },
);

const billSchema = new mongoose.Schema(
  {
    sourceBillSummaryId: { type: String, default: '' },
    billNo: { type: String, default: '', trim: true },
    billType: { type: String, default: '', trim: true },
    customerName: { type: String, required: true, trim: true },
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
      match: [/^\+91\d{10}$/, 'Phone number must be in +91XXXXXXXXXX format'],
    },
    billAmount: { type: Number, required: true, min: 0 },
    items: { type: [billItemSchema], default: [] },
    pdfUrl: { type: String, default: '' },
    pdfPath: { type: String, default: '' },
    whatsappStatus: {
      type: String,
      enum: ['pending', 'sent', 'failed'],
      default: 'pending',
      index: true,
    },
    whatsappAttempts: { type: Number, default: 0, min: 0 },
    whatsappMessageSid: { type: String, default: '', index: true },
    whatsappError: { type: String, default: '' },
    lastWhatsappAttemptAt: { type: Date, default: null },
    sentAt: { type: Date, default: null },
  },
  { timestamps: true },
);

billSchema.index({ createdAt: -1 });
billSchema.index({ customerName: 1, createdAt: -1 });
billSchema.index(
  { sourceBillSummaryId: 1 },
  { unique: true, partialFilterExpression: { sourceBillSummaryId: { $type: 'string', $ne: '' } } },
);

module.exports = mongoose.models.Bill || mongoose.model('Bill', billSchema);
