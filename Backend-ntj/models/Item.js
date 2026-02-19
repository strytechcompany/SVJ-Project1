const mongoose = require('mongoose');

const ItemSchema = new mongoose.Schema({
  stockName: { type: String, required: true },
  itemDetails: { type: String, required: true },
  buyingTouch: { type: Number, required: true },
  sellingTouch: { type: Number, required: true },
  percentage: { type: Number, required: true },
  date: { type: String, required: true },
  issue: { type: Boolean, default: false },
  receipt: { type: Boolean, default: false },
  type: { type: String, enum: ['issue', 'receipt'], default: null }, // issue or receipt
}, { timestamps: true });

module.exports = mongoose.model('Item', ItemSchema);