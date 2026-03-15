const mongoose = require('mongoose');

const cashReceivedSchema = new mongoose.Schema({
    rupees :{type : Number, required: true},
    goldrate : {type : Number, required: true},
    pure :{type : Number, required: true},

}, { timestamps: true });

module.exports = mongoose.model('CashReceived', cashReceivedSchema);