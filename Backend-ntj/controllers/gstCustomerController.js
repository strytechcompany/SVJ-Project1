const GSTCustomer = require("../models/GstCustomer");

const getGstCustomers = async (req, res) => {
  try {
    const customers = await GSTCustomer.find().sort({ updatedAt: -1, createdAt: -1 });
    res.json(customers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const normalizeRow = (row = {}, index = 0) => ({
  sno: String(row.sno ?? index + 1).trim(),
  particular: String(row.particular || "").trim(),
  hsnCode: String(row.hsnCode || row.hsn || "").trim(),
  weight: String(row.weight || "").trim(),
  rate: String(row.rate || "").trim(),
  taxableValue: String(row.taxableValue || "").trim(),
  cgst: String(row.cgst || row.cgstAmount || "").trim(),
  sgst: String(row.sgst || row.sgstAmount || "").trim(),
  total: String(row.total || "").trim(),
});

const normalizeBankDetails = (bankDetails = {}) => ({
  accountName: String(bankDetails.accountName || "").trim(),
  accountNo: String(bankDetails.accountNo || "").trim(),
  ifsc: String(bankDetails.ifsc || "").trim(),
  branch: String(bankDetails.branch || "").trim(),
});

const createGstCustomer = async (req, res) => {
  const {
    customerName,
    phoneNumber,
    address,
    gstin,
    date,
    invoiceNo,
    totalInvoiceValue,
    billRows,
    bankDetails,
  } = req.body;
  try {
    const exists = await GSTCustomer.findOne({
      customerName: String(customerName || "").trim(),
      phoneNumber: String(phoneNumber || "").trim(),
    });
    if (exists) {
      return res.status(400).json({ message: "GST customer already exists" });
    }

    const customer = new GSTCustomer({
      customerName,
      phoneNumber,
      address,
      gstin: gstin || "",
      date: date || "",
      invoiceNo: invoiceNo || "",
      totalInvoiceValue: totalInvoiceValue || "",
      billRows: Array.isArray(billRows) ? billRows.map(normalizeRow) : [],
      bankDetails: normalizeBankDetails(bankDetails),
    });
    const saved = await customer.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const updateGstCustomer = async (req, res) => {
  try {
    const customer = await GSTCustomer.findById(req.params.id);
    if (!customer) return res.status(404).json({ message: "GST customer not found" });

    const {
      customerName,
      phoneNumber,
      address,
      gstin,
      date,
      invoiceNo,
      totalInvoiceValue,
      billRows,
      bankDetails,
    } = req.body;
    if (customerName !== undefined) customer.customerName = customerName;
    if (phoneNumber !== undefined) customer.phoneNumber = phoneNumber;
    if (address !== undefined) customer.address = address;
    if (gstin !== undefined) customer.gstin = gstin;
    if (date !== undefined) customer.date = date;
    if (invoiceNo !== undefined) customer.invoiceNo = invoiceNo;
    if (totalInvoiceValue !== undefined) customer.totalInvoiceValue = totalInvoiceValue;
    if (billRows !== undefined) {
      customer.billRows = Array.isArray(billRows) ? billRows.map(normalizeRow) : [];
    }
    if (bankDetails !== undefined) {
      customer.bankDetails = normalizeBankDetails(bankDetails);
    }

    const updated = await customer.save();
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const deleteGstCustomer = async (req, res) => {
  try {
    const customer = await GSTCustomer.findById(req.params.id);
    if (!customer) return res.status(404).json({ message: "GST customer not found" });
    await customer.deleteOne();
    res.json({ message: "GST customer deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getGstCustomers,
  createGstCustomer,
  updateGstCustomer,
  deleteGstCustomer,
};
