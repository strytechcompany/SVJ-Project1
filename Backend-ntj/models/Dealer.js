const mongoose = require("mongoose");

const dealerSchema = new mongoose.Schema({
  customerName: {
    type: String,
    required: true,
    trim: true,
  },
  phoneNumber: {
    type: String,
    required: true,
    trim: true,
  },
  gstin: {
    type: String,
    trim: true,
  },
  address: {
    type: String,
    trim: true,
  },
  oldBalance: {
    type: Number,
    default: 0,
  },
  advanceBalance: {
    type: Number,
    default: 0,
  },
  customerType: {
    type: String,
    default: "Dealer",
  },
  workerName: {
    type: String,
    default: "",
  },
  image: {
    type: String,
    default: null,
  },
  receiptImage: {
    type: String,
    default: null,
  },
  proofImage: {
    type: String,
    default: null,
  },
  receiptImageShowInBill: {
    type: Boolean,
    default: true,
  },
  billCurrentBalance: {
    type: Number,
    default: 0,
  },
  availableBalance: {
    type: Number,
    default: 0,
  },
  lastTransactionDate: {
    type: Date,
    default: null,
  },
  lastTransactionType: {
    type: String,
    default: "",
  },
  gstPercentage: { type: String, default: "" },
  gstAmount: { type: String, default: "" },
  sgst: { type: String, default: "" },
  cgst: { type: String, default: "" },
  igst: { type: String, default: "" },

  // Last Bill Tracking Fields
  lastBillNo: { type: String, default: "" },
  lastBillDate: { type: Date, default: null },
  lastBillAmount: { type: Number, default: 0 },
  lastBillWeight: { type: Number, default: 0 },
  lastBillPureWeight: { type: Number, default: 0 },
}, {
  timestamps: true,
});

module.exports = mongoose.model("Dealer", dealerSchema);
