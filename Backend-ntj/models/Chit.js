const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    receiptNo: { type: Number },
    installmentNo: { type: Number },
    amount: { type: Number, required: true },
    goldRate: { type: Number, required: true },
    calWeight: { type: Number, required: true },
    totalWeight: { type: Number, required: true },
    date: { type: String, required: true },
}, { timestamps: true });

const ChitSchema = new mongoose.Schema({
    groupCode: { type: String, required: true, unique: true },
    customerName: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, default: '' },
    monthlyAmount: { type: Number, required: true },
    goldRate: { type: Number, required: true },
    calculatedWeight: { type: Number, required: true },
    months: { type: Number, default: 12 },
    totalWeight: { type: Number, default: 0 },
    installmentNo: { type: Number, default: 0 },
    payments: [paymentSchema],
}, { timestamps: true });

module.exports = mongoose.model('Chit', ChitSchema);
