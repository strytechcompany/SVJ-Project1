const mongoose = require('mongoose');

const ItemSchema = new mongoose.Schema({
  itemName: { type: String, required: true },
  buyingTouch: { type: Number, required: true },
  sellingTouch: { type: Number, required: true },
  cash: { type: Number, required: true },
  cashPercentage: { type: Number, required: true },
}, { timestamps: true });

module.exports = mongoose.model('Item', ItemSchema);
