const mongoose = require('mongoose');

const UPISchema = new mongoose.Schema({
  upiId: {
    type: String,
    required: true,
    trim: true,
  },
  isPrimary: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

module.exports = mongoose.model('UPI', UPISchema);
