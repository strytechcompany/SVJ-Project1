const mongoose = require('mongoose');

/**
 * A single-document counter used to generate global sequential bill numbers.
 * The document with key="global" holds the last assigned number.
 */
const billCounterSchema = new mongoose.Schema(
    {
        key: { type: String, default: 'global', unique: true },
        counter: { type: Number, default: 0 },
    },
    { timestamps: false }
);

module.exports =
    mongoose.models.BillCounter ||
    mongoose.model('BillCounter', billCounterSchema, 'billcounters');
