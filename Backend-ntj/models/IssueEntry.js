const mongoose = require('mongoose');

const IssueEntrySchema = new mongoose.Schema({
    itemName: { type: String, required: true },
    weight: { type: Number, required: true },
    stone: { type: Number },
    touch: { type: Number },
    purity: { type: Number, required: true },
    buyingCost: { type: Number },
    sellingCost: { type: Number },
    plus: { type: Number },
}, { timestamps: true });

module.exports = mongoose.model('IssueEntry', IssueEntrySchema);