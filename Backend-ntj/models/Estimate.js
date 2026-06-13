const mongoose = require("mongoose");

const estimateItemSchema = new mongoose.Schema(
  {
    itemName: { type: String, trim: true },
    weight: { type: Number, default: 0 },
    wastagePercent: { type: Number, default: 0 },
    grossWeight: { type: Number, default: 0 },
    goldRate: { type: Number, default: 0 },
    netAmount: { type: Number, default: 0 },
    gst: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },
  },
  { _id: false }
);

const estimateSchema = new mongoose.Schema(
  {
    itemName: {
      type: String,
      required: true,
      trim: true,
    },
    weight: {
      type: Number,
      required: true,
    },
    wastagePercent: {
      type: Number,
      default: 0,
    },
    grossWeight: {
      type: Number,
      required: true,
    },
    goldRate: {
      type: Number,
      required: true,
    },
    netAmount: {
      type: Number,
      required: true,
    },
    gst: {
      type: Number,
      required: true,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    items: {
      type: [estimateItemSchema],
      default: [],
    },
    enableGST: {
      type: Boolean,
      default: false,
    },
    customerName: {
      type: String,
      default: "Estimate Customer",
      trim: true,
    },
    customerPhone: {
      type: String,
      default: "N/A",
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: "estimates",
  }
);

module.exports = mongoose.model("Estimate", estimateSchema);
