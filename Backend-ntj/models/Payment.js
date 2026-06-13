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

paymentSchema.index({ type: 1, createdAt: -1 });
paymentSchema.index({ selectedDealer: 1, createdAt: -1 });
paymentSchema.index({ date: -1 });
paymentSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Payment', paymentSchema);
