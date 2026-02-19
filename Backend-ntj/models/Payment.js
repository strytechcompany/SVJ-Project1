const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  totalMetal: { type: Number, required: function() { return this.type !== 'dealerTransfer'; } },
  totalCash: { type: Number, required: function() { return this.type !== 'dealerTransfer'; } },
  totalPure: { type: Number, required: function() { return this.type !== 'dealerTransfer'; } },
  cashPaid: { type: Number, required: function() { return this.type !== 'dealerTransfer'; } },
  selectedDealer: { type: String, default: null },
  selectedItems: [{ type: String }],
  receiptItems: [{
    item: String,
    weight: Number,
    stone: Number,
    touch: Number,
    purity: Number
  }],
  date: { type: Date },
  totalSelectedWeight: { type: Number },
  weightSubtraction: { type: Number },
  transferWeight: { type: Number },
  type: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);
