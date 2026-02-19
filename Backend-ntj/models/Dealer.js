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
}, {
  timestamps: true,
});

module.exports = mongoose.model("Dealer", dealerSchema);
