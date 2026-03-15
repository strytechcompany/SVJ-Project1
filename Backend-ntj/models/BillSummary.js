const mongoose = require('mongoose');

const issueItemSchema = new mongoose.Schema(
  {
    name: { type: String, default: '' },
    gross: { type: String, default: '0.000' },
    m: { type: String, default: '0.000' },
    net: { type: String, default: '0.000' },
    calc: { type: String, default: '0.000' },
    pure: { type: String, default: '0.000' },
  },
  { _id: false },
);

const receiptItemSchema = new mongoose.Schema(
  {
    name: { type: String, default: '' },
    weight: { type: String, default: '0.000' },
    result: { type: String, default: '0.000' },
    calc: { type: String, default: '0.000' },
    pure: { type: String, default: '0.000' },
    // B2C old-gold shape
    sub: { type: String, default: '0.000' },
    netWeight: { type: String, default: '0.000' },
    rate: { type: String, default: '0.00' },
    amount: { type: String, default: '0.00' },
  },
  { _id: false },
);

const cashTableSchema = new mongoose.Schema(
  {
    rupees: { type: Number, default: 0 },
    goldRate: { type: Number, default: 0 },
    pure: { type: Number, default: 0 },
  },
  { _id: false },
);

const billSummarySchema = new mongoose.Schema(
  {
    customerId: { type: String, required: true, index: true },
    customerName: { type: String, required: true },
    billNo: { type: String, required: true },
    billType: { type: String, enum: ['B2B', 'B2C'], required: true, index: true },

    issueItems: { type: [issueItemSchema], default: [] },
    receiptItems: { type: [receiptItemSchema], default: [] },
    cashTable: { type: [cashTableSchema], default: [] },
    // B2C saved item table payload (itemName/weight/touch/wastage/rate/total/gst/final)
    items: { type: [mongoose.Schema.Types.Mixed], default: [] },

    totalIssueWeight: { type: Number, default: 0 },
    totalReceiptWeight: { type: Number, default: 0 },
    cashAmount: { type: Number, default: 0 },
    kadaiAmount: { type: Number, default: 0 },
    advanceBalance: { type: Number, default: 0 },
    oldBalance: { type: Number, default: 0 },
    availableBalance: { type: Number, default: 0 },

    // Backward-compatible fields used by existing screens/reports
    customerType: { type: String, enum: ['B2B', 'B2C'], default: 'B2B' },
    // Preserve original SD classification while storing in B2B collection.
    dealerType: { type: String, default: '' },
    invoiceNo: { type: String, default: 'N/A' },
    date: { type: String, default: '' },
    ob: { type: Number, default: 0 },
    issuePure: { type: Number, default: 0 },
    receiptPure: { type: Number, default: 0 },
    cashPure: { type: Number, default: 0 },
    gstPure: { type: Number, default: 0 },
    advBal: { type: Number, default: 0 },
    currentBalance: { type: Number, default: 0 },
    receiptImage: { type: String, default: null },
    proofImage: { type: String, default: null },
    image: { type: String, default: null },
    receiptImageShowInBill: { type: Boolean, default: true },
    isConvertedToGold: { type: Boolean, default: false },
    gst: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true, strict: true },
);

billSummarySchema.index({ customerId: 1, billNo: 1 }, { unique: true });
billSummarySchema.index({ createdAt: -1 });

const normalizeBillType = (billType) => (String(billType || '').toUpperCase() === 'B2C' ? 'B2C' : 'B2B');

const getBillSummaryModel = (billType) => {
  const type = normalizeBillType(billType);
  const modelName = type === 'B2C' ? 'BillSummaryB2C' : 'BillSummaryB2B';
  const collectionName = type === 'B2C' ? 'b2c' : 'b2b';

  return mongoose.models[modelName] || mongoose.model(modelName, billSummarySchema, collectionName);
};

const getLegacyBillSummaryModel = () => {
  const modelName = 'BillSummaryLegacy';
  const collectionName = 'billsummaries';
  return mongoose.models[modelName] || mongoose.model(modelName, billSummarySchema, collectionName);
};

module.exports = {
  normalizeBillType,
  getBillSummaryModel,
  getLegacyBillSummaryModel,
};
