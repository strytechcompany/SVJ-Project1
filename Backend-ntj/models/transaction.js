const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  customerName: { type: String, required: true },
  customerId: { type: String, required: true },
  customerType: { type: String, default: "B2B" },
  type: { type: String, default: "B2B" },
  dealerType: { type: String, default: "" },
  receiptImage: { type: String, default: null },
  proofImage: { type: String, default: null },
  image: { type: String, default: null },
  receiptImageShowInBill: { type: Boolean, default: true },
  issueTotal: { type: Number, required: true },
  issuePure: { type: Number, required: true },
  oldBalance: { type: Number, required: true },
  receiptPure: { type: Number, required: true },
  cashPure: { type: Number, required: true },
  balance: { type: Number, required: true },
  advBal: { type: Number, required: true },
  date: { type: String, default: "" },
  description: { type: String, default: "" },
  isConvertedToGold: { type: Boolean, default: false },
}, { timestamps: true });

TransactionSchema.index({ customerId: 1, createdAt: -1 });
TransactionSchema.index({ customerName: 1, createdAt: -1 });
TransactionSchema.index({ dealerType: 1, createdAt: -1 });
TransactionSchema.index({ type: 1, createdAt: -1 });
TransactionSchema.index({ date: -1 });
TransactionSchema.index({ createdAt: -1 });
TransactionSchema.index({ updatedAt: -1, createdAt: -1 });

module.exports = mongoose.model("Transaction", TransactionSchema);
