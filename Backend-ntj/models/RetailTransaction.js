// models/RetailTransaction.js

const mongoose = require("mongoose");

const RetailTransactionSchema = new mongoose.Schema(
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
      type: String, // or Date
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
  { timestamps: true }
);

module.exports = mongoose.model("RetailTransaction", RetailTransactionSchema);
