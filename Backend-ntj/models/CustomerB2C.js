const express = require('express');
const mongoose = require('mongoose');

// Function to generate 6-digit random ID
function generateCustomerId() {
  return Math.floor(100000 + Math.random() * 900000);
}

const customerB2CSchema = new mongoose.Schema({
  customerId: {
    type: Number,
    default: generateCustomerId,
    unique: true
  },
  customerName: { 
    type: String, 
    required: true 
  },
  phoneNumber: { 
    type: String, 
    required: true 
  },
  address: { 
    type: String, 
    default: "" 
  },
  oldBalance: { 
    type: Number, 
    default: 0 
  },
  advanceBalance: { 
    type: Number, 
    default: 0 
  },
  gstin: { 
    type: String, 
    default: "" 
  },
  billCurrentBalance: { 
    type: Number, 
    default: 0 },
  availableBalance: {
    type: Number,
    default: 0
  },
  lastTransactionDate: {
    type: Date,
    default: null
  },
  lastTransactionType: {
    type: String,
    default: ""
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
  customerType: {
    type: String,
    default: "B2C",
  },
}, 
{ timestamps: true });

customerB2CSchema.index({ phoneNumber: 1 });
customerB2CSchema.index({ createdAt: -1 });
customerB2CSchema.index({ lastTransactionDate: -1 });

module.exports = mongoose.model('CustomerB2C', customerB2CSchema);
