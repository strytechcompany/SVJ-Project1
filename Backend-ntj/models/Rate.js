const mongoose = require("mongoose");

const rateSchema = new mongoose.Schema(
  {
    goldRate: {
      type: String,
      required: true,
    },
    goldDate: {
      type: String,
      required: true,
    },
    ftRate: {
      type: String,
      required: true,
    },
    ftDate: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Rate", rateSchema);
