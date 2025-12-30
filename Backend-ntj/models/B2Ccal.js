const mongoose = require('mongoose');

const B2CcalSchema = new mongoose.Schema({
    customerName: { 
    type: String, 
    required: true 
  },
  Address: { 
    type: String, 
    required: true 
    },
Phone: { 
    type: String, 
    required: true
    },
    Date: {
    type: Date,
    required: true
    },
    InvoiceNumber: { 
    type: String, 
    required: true
    },
});

module.exports = mongoose.model('B2Ccal', B2CcalSchema);