const mongoose = require("mongoose");

const ItemSchema = new mongoose.Schema({
  name: { type: String, default: "N/A" },
  weight: { type: Number, default: 0 },
  count: { type: Number, default: 1 },
  pure: { type: Number, default: 0 },
  rate: { type: Number, default: 0 },
  amount: { type: Number, default: 0 },
});

const SuspenseTransactionSchema = new mongoose.Schema(
  {
    customer: {
      name: { type: String, default: "Suspense Customer" },
      phone: { type: String, default: "N/A" },
      address: { type: String, default: "N/A" },
      date: { type: String },
      type: { type: String, default: "Suspense" },
    },
    suspense: {
      issueItems: [ItemSchema],
      receiptItems: [ItemSchema],
      goldRate: { type: Number, default: 0 },
      netPure: { type: Number, default: 0 },
      netAmount: { type: Number, default: 0 },
      totalIssuePure: { type: Number, default: 0 },
      totalReceiptPure: { type: Number, default: 0 },
      totalIssueAmount: { type: Number, default: 0 },
      totalReceiptAmount: { type: Number, default: 0 },
    },
    date: { type: String },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "SuspenseTransaction",
  SuspenseTransactionSchema
);
