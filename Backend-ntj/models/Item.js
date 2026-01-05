const mongoose = require('mongoose');

const ItemSchema = new mongoose.Schema({
  stockName: { type: String, required: true },
  itemDetails: { type: String, required: true },
  buyingTouch: { type: Number, required: true },
  sellingTouch: { type: Number, required: true },
  percentage: { type: Number, required: true },
  date: { type: String, required: true }, // store date as string like "dd/mm/yyyy"
}, { timestamps: true });

module.exports = mongoose.model('Item', ItemSchema);
