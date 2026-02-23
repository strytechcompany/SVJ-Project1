const mongoose = require('mongoose');

// Generate 6-digit customer ID
function generateCustomerId() {
  return Math.floor(100000 + Math.random() * 900000);
}

const customerSchema = new mongoose.Schema({
  customerId: {
    type: Number,
    default: generateCustomerId,
    unique: true,
  },
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
  shopName: {
    type: String,
    required: true,
    trim: true,
  },
  address: {
    type: String,
    required: true,
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
  gstin: {
  type: String,
  default: '',
  trim: true,
},
}, {
  timestamps: true
});

// Unique index to prevent duplicate customerName + shopName
customerSchema.index({ customerName: 1, shopName: 1 }, { unique: true });

module.exports = mongoose.model('Customer', customerSchema);
