// models/Customer.js
const mongoose = require('mongoose');

function generateCustomerId() {
  return Math.floor(100000 + Math.random() * 900000); // 6-digit random number
}

const customerSchema = new mongoose.Schema({
  customerId: {
    type: Number,
    default: generateCustomerId,
    unique: true
  },
  customerName: {
    type: String,
    required: true,
    trim: true
  },
  phoneNumber: {
    type: String,
    required: true,
    trim: true
  },
  emailId: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  shopName: {
    type: String,
    required: true,
    trim: true
  },
  oldBalance: {
    type: Number,
    default: 0
  },
  advanceBalance: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Customer', customerSchema);
