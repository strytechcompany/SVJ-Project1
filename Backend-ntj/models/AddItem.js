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
        required: false
    },
    wm: {
        type: Number,
        required: false
    },
    rate: {
        type: Number,
        required: false
    },
    total: {
        type: Number,
        required: false
    },
    gst: {
        type: Number,
        required: false
    },
    final: {
        type: Number,
        required: false
    },
    // --- NEW FIELDS FROM B2B-STYLE UPDATE ---
    itemNumber: {
        type: String,
        default: ''
    },
    count: {
        type: Number,
        default: 1
    },
    sriCost: {
        type: Number,
        default: 0
    },
    sriBill: {
        type: Number,
        default: 0
    },
    plus: {
        type: Number,
        default: 0
    },
    purity: {
        type: Number,
        default: 0
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