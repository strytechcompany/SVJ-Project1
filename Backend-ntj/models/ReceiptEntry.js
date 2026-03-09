const mongoose = require('mongoose');

const ReceiptEntrySchema = new mongoose.Schema({
    itemName: { type: String, required: true },
    weight: { type: Number, required: true },
    stone: { type: Number, required: true },
    touch: { type: Number, required: true },
    purity: { type: Number, required: true },
}, { timestamps: true });

module.exports = mongoose.model('ReceiptEntry', ReceiptEntrySchema);