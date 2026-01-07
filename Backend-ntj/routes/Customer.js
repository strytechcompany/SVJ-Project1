const express = require('express');
const router = express.Router();
const Customer = require('../models/Customer');

// Get all B2B customers
router.get('/', async (req, res) => {
  try {
    const customers = await Customer.find();
    res.json(customers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get single customer by ID
router.get('/:id', async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    res.json(customer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create new customer
router.post('/', async (req, res) => {
  const { customerName, phoneNumber, shopName, address, oldBalance, advanceBalance } = req.body;

  try {
    // Check duplicate
    const exists = await Customer.findOne({ customerName: customerName.trim(), shopName: shopName.trim() });
    if (exists) return res.status(400).json({ message: 'Customer already exists' });

    const customer = new Customer({
      customerName,
      phoneNumber,
      shopName,
      address,
      oldBalance: oldBalance || 0,
      advanceBalance: advanceBalance || 0,
    });

    const newCustomer = await customer.save();
    res.status(201).json(newCustomer);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update customer
router.put('/:id', async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    const { customerName, phoneNumber, shopName, address, oldBalance, advanceBalance } = req.body;

    if (customerName) customer.customerName = customerName;
    if (phoneNumber) customer.phoneNumber = phoneNumber;
    if (shopName) customer.shopName = shopName;
    if (address) customer.address = address;
    if (oldBalance !== undefined) customer.oldBalance = oldBalance;
    if (advanceBalance !== undefined) customer.advanceBalance = advanceBalance;

    const updatedCustomer = await customer.save();
    res.json(updatedCustomer);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete customer
router.delete('/:id', async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    await customer.deleteOne();
    res.json({ message: 'Customer deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;