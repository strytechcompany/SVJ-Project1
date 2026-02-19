const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  customerName: { type: String, required: true },
  customerId: { type: String, required: true },
  issueTotal: { type: Number, required: true },
  issuePure: { type: Number, required: true },
  oldBalance: { type: Number, required: true },
  receiptPure: { type: Number, required: true },
  cashPure: { type: Number, required: true },
  balance: { type: Number, required: true },
  advBal: { type: Number, required: true }
}, { timestamps: true });

module.exports = mongoose.model("Transaction", TransactionSchema);
