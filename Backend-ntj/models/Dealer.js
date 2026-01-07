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
  emailId: {
    type: String,
    trim: true,
  },
  shopName: {
    type: String,
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
}, {
  timestamps: true, // createdAt and updatedAt
});

module.exports = mongoose.model("Dealer", dealerSchema);
