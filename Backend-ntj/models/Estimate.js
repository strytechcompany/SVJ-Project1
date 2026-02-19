const mongoose = require("mongoose");

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
