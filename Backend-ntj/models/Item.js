const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  itemName: { type: String, required: true },
  weight: { type: Number, required: true },
  buyingTouch: { type: Number, required: true },
  sellingTouch: { type: Number, required: true },
  cash: { type: Number, required: true },
  cashPercentage: { type: Number, required: true },
  cashWeight: { type: Number, required: true },
}, { timestamps: true });

module.exports = mongoose.model('Item', itemSchema);
