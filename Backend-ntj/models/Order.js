const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
    itemName: { type: String, required: true },
    itemWeight: { type: Number, required: true },
    customerName: { type: String, required: true },
    mobileNumber: { type: String, required: true },
    paymentType: {
        type: String,
        enum: ["UPI", "Cash", "Bank Transfer", "Card"],
        default: "Cash",
        required: true,
    },
    amount: { type: Number, default: 0 },
    balanceAmount: { type: Number, default: 0 },
    deliveryDate: { type: Date }, // optional if needed later
}, { timestamps: true });

module.exports = mongoose.model('Order', OrderSchema);
