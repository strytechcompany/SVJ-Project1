const mongoose = require('mongoose');

const ReceiptEntrySchema = new mongoose.Schema({
    billNo:       { type: String, default: '' },   // manual
    receiptType:  { type: String, default: '' },   // manual text (e.g. "Old Gold")
    itemName:     { type: String, default: '' },   // kept for compatibility
    weight:       { type: Number, required: true },
    less:         { type: Number, default: 0 },    // grams, manual
    actualTouch:  { type: Number, default: 0 },   // %, manual
    takenTouch:   { type: Number, default: 0 },   // %, manual
    purity:       { type: Number, required: true },// (weight - less) × takenTouch / 100
    goldRate:     { type: Number, default: 0 },   // manual ₹, informational
    amount:       { type: Number, default: 0 },   // manual ₹, informational
    // legacy fields kept for backward compatibility
    stone:        { type: Number, default: 0 },
    touch:        { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('ReceiptEntry', ReceiptEntrySchema);