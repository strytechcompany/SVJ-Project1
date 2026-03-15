const mongoose = require("mongoose");

const gstCustomerSchema = new mongoose.Schema(
  {
    customerName: { type: String, required: true, trim: true },
    phoneNumber: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    gstin: { type: String, default: "", trim: true },
    date: { type: String, default: "" },
  },
  { timestamps: true }
);

gstCustomerSchema.index({ customerName: 1, phoneNumber: 1 }, { unique: true });

module.exports = mongoose.model("GSTCustomer", gstCustomerSchema);
