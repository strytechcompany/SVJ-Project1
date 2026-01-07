const mongoose = require("mongoose");

const purchaseSchema = new mongoose.Schema(
  {
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Dealer",
      required: false,
    },
    supplierName: {
      type: String,
      required: false,
    },
    issueItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Item",
      required: false,
    },
    issueItemName: {
      type: String,
      required: false,
    },
    receiptItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Item",
      required: false,
    },
    receiptItemName: {
      type: String,
      required: false,
    },
    cash: {
      type: Number,
      default: 0,
    },
    date: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
purchaseSchema.index({ supplier: 1, date: -1 });
purchaseSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Purchase", purchaseSchema);