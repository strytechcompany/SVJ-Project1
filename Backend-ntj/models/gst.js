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
  hsn: { type: String },
  netWeight: { type: String },
  stone: { type: String },
  finalValue: { type: String }, // pureWeight for B2B or finalAmount for B2C

  date: { type: String },
  time: { type: String },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("GST", gstSchema);
