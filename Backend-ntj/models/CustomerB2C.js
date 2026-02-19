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
    required: true 
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
  }
}, { timestamps: true });

module.exports = mongoose.model('CustomerB2C', customerB2CSchema);
