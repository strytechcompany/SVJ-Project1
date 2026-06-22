const mongoose = require('mongoose');

const IssueEntrySchema = new mongoose.Schema({
    billNo:      { type: String, default: '' },
    barcode:     { type: String, default: '' },
    itemNumber:  { type: String, default: '' },
    itemName:    { type: String, required: true },
    weight:      { type: Number, required: true },
    count:       { type: Number, default: 1 },
    sriCost:     { type: Number, default: 0 },   // SRI COST (manual ₹)
    sriBill:     { type: Number, default: 0 },   // SRI BILL (manual ₹)
    plus:        { type: Number, default: 0 },   // sriBill - sriCost
    purity:      { type: Number, required: true },// weight × plus / 100
    // legacy fields kept for backward compatibility
    stone:       { type: Number, default: 0 },
    touch:       { type: Number, default: 0 },
    buyingCost:  { type: Number, default: 0 },
    sellingCost: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('IssueEntry', IssueEntrySchema);