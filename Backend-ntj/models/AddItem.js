const mongoose = require('mongoose');

const AddItemSchema = new mongoose.Schema({
    customerName: {
        type: String,
        required: true
    },
    invoiceNo: {
        type: String,
        default: 'N/A'
    },
    itemName: { 
        type: String,
        required: true
    },
    weight: {  // This will store the MODIFIED WEIGHT (remaining stock)
        type: Number,
        required: true
    },
    touch: {
        type: Number,
        required: true
    },
    wm: {
        type: Number,
        required: true
    },
    rate: {
        type: Number,
        required: true
    },
    total: {
        type: Number,
        required: true
    },
    gst: {
        type: Number,
        required: true
    },
    final: {
        type: Number,
        required: true
    },
    modifiedWeight: {  // The remaining stock after deduction
        type: Number,
        required: true
    },
    stockMasterId: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        required: true
    }
}, {
    timestamps: true  // Automatically adds createdAt and updatedAt
});

module.exports = mongoose.model('AddItem', AddItemSchema);