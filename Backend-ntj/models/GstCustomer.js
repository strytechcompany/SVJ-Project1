const mongoose = require("mongoose");

const gstCustomerSchema = new mongoose.Schema(
  {
    customerName: { type: String, required: true, trim: true },
    phoneNumber: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    gstin: { type: String, default: "", trim: true },
    date: { type: String, default: "" },
    invoiceNo: { type: String, default: "", trim: true },
    totalInvoiceValue: { type: String, default: "", trim: true },
    billRows: [
      {
        sno: { type: String, default: "", trim: true },
        particular: { type: String, default: "", trim: true },
        hsnCode: { type: String, default: "", trim: true },
        weight: { type: String, default: "", trim: true },
        rate: { type: String, default: "", trim: true },
        taxableValue: { type: String, default: "", trim: true },
        cgst: { type: String, default: "", trim: true },
        sgst: { type: String, default: "", trim: true },
        total: { type: String, default: "", trim: true },
      },
    ],
    bankDetails: {
      accountName: { type: String, default: "", trim: true },
      accountNo: { type: String, default: "", trim: true },
      ifsc: { type: String, default: "", trim: true },
      branch: { type: String, default: "", trim: true },
    },
  },
  { timestamps: true }
);

gstCustomerSchema.index({ customerName: 1, phoneNumber: 1 }, { unique: true });

module.exports = mongoose.model("GSTCustomer", gstCustomerSchema);
