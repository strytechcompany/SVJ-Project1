const mongoose = require("mongoose");

function generateCustomerId() {
  return Math.floor(100000 + Math.random() * 900000);
}

const customerSchema = new mongoose.Schema(
  {
    customerId: {
      type: Number,
      default: generateCustomerId,
      unique: true,
    },
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
    shopName: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      required: true,
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
    gstin: {
      type: String,
      default: "",
      trim: true,
    },
    // ✅ NEW FIELD - stores the CURRENT value from last generated bill
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
  },
  {
    timestamps: true,
  },
);

customerSchema.index({ customerName: 1, shopName: 1 }, { unique: true });

module.exports = mongoose.model("Customer", customerSchema);
