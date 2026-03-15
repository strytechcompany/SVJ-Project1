const GSTCustomer = require("../models/GstCustomer");

const getGstCustomers = async (req, res) => {
  try {
    const customers = await GSTCustomer.find().sort({ createdAt: -1 });
    res.json(customers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const createGstCustomer = async (req, res) => {
  const { customerName, phoneNumber, address, gstin, date } = req.body;
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

    const { customerName, phoneNumber, address, gstin, date } = req.body;
    if (customerName !== undefined) customer.customerName = customerName;
    if (phoneNumber !== undefined) customer.phoneNumber = phoneNumber;
    if (address !== undefined) customer.address = address;
    if (gstin !== undefined) customer.gstin = gstin;
    if (date !== undefined) customer.date = date;

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
