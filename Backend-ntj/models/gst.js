const mongoose = require("mongoose");

const gstSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["B2B", "B2C"],
    required: true,
  },
  sgst: { type: String },
  cgst: { type: String },
  igst: { type: String },
  enabled: { type: Boolean, default: false },
  hsn: { type: String },
  netWeight: { type: String },
  stone: { type: String },
  finalValue: { type: String },

  date: { type: String },
  time: { type: String },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("GST", gstSchema);
