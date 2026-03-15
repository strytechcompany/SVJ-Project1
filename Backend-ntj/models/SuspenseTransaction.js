const mongoose = require("mongoose");

const SuspenseTransactionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    oldBalance: {
      type: Number,
      required: true,
    },
    newBalance: {
      type: Number,
      required: true,
    },
    date: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Completed", "Rejected"],
      default: "Pending",
    },
    paymentType: {
      type: String,
      enum: ["Cash", "UPI", "Bank"],
      default: "Cash",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "SuspenseTransaction",
  SuspenseTransactionSchema
);
