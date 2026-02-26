const mongoose = require('mongoose');

const issueItemSchema = new mongoose.Schema({
  name: { type: String, default: '' },
  gross: { type: String, default: '0.000' },
  m: { type: String, default: '0.000' },
  net: { type: String, default: '0.000' },
  calc: { type: String, default: '0.000' },
  pure: { type: String, default: '0.000' },
});

const receiptItemSchema = new mongoose.Schema({
  name: { type: String, default: '' },
  weight: { type: String, default: '0.000' },
  result: { type: String, default: '0.000' },
  calc: { type: String, default: '0.000' },
  pure: { type: String, default: '0.000' },
});

const cashTableSchema = new mongoose.Schema({
  rupees: { type: Number, default: 0 },
  goldRate: { type: Number, default: 0 },
  pure: { type: Number, default: 0 },
});

const billSummarySchema = new mongoose.Schema(
  {
    customerId: { type: String, required: true },
    customerName: { type: String, required: true },
    customerType: { type: String, enum: ['B2B', 'B2C'], default: 'B2B' },
    invoiceNo: { type: String, default: 'N/A' },
    date: { type: String, default: '' },

    ob: { type: Number, default: 0 },
    issuePure: { type: Number, default: 0 },
    receiptPure: { type: Number, default: 0 },
    cashPure: { type: Number, default: 0 },
    gstPure: { type: Number, default: 0 },
    advBal: { type: Number, default: 0 },
    currentBalance: { type: Number, default: 0 },

    issueItems: { type: [issueItemSchema], default: [] },
    receiptItems: { type: [receiptItemSchema], default: [] },
    cashTable: { type: [cashTableSchema], default: [] },

    // ✅ FIX: Mixed type accepts null (GST off) or object (GST on)
    gst: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('BillSummary', billSummarySchema);