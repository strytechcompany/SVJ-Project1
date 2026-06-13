const mongoose = require('mongoose');

const StockMasterSchema = new mongoose.Schema({
    itemNumber: { type: String, unique: true, sparse: true },
    itemName: { type: String, required: true },
    category: { type: String, required: true },
    designName: { type: String },
    supplierName: { type: String },
    grossWeight: { type: Number, required: true },
    netWeight: { type: Number, required: true },
    purity: { type: String, required: true },
    buyingTouch: { type: Number },
    quantity: { type: Number, default: 1 },
    workerName: { type: String, default: "" },
    barcode: { type: String, unique: true, sparse: true }
}, { timestamps: true });

module.exports = mongoose.model('StockMaster', StockMasterSchema);