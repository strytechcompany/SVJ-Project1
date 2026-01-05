const mongoose = require('mongoose');

const StockMasterSchema = new mongoose.Schema({
    itemName: { type: String, required: true },
    weight: { type: Number, required: true },
    less: { type: Number, required: true },
    netWeight: { type: Number, required: true },
    calculation: { type: String, required: true },
    pure: { type: Number, required: true },
    workerName: { type: String, default: "" },
    description: { type: String, default: "" }
}, { timestamps: true });

module.exports = mongoose.model('StockMaster', StockMasterSchema);