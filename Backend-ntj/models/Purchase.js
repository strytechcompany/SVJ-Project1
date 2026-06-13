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
    issueEntries: [{
      item: { type: mongoose.Schema.Types.ObjectId, ref: "Item" },
      itemName: { type: String },
      weight: { type: Number, default: 0 }
    }],
    receiptEntries: [{
      item: { type: mongoose.Schema.Types.ObjectId, ref: "Item" },
      itemName: { type: String },
      weight: { type: Number, default: 0 }
    }],
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