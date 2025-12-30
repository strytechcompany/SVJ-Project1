// --- routes/customerB2C.js ---
const express = require('express');
const router = express.Router();
const CustomerB2C = require('../models/CustomerB2C');


// Create a new customer
router.post('/', async (req, res) => {
try {
const customer = new CustomerB2C(req.body);
const savedCustomer = await customer.save();
res.status(201).json(savedCustomer);
} catch (err) {
res.status(400).json({ message: err.message });
}
});


// Get all customers
router.get('/', async (req, res) => {
try {
const customers = await CustomerB2C.find();
res.json(customers);
} catch (err) {
res.status(500).json({ message: err.message });
}
});


// Get a single customer by ID
router.get('/:id', async (req, res) => {
try {
const customer = await CustomerB2C.findById(req.params.id);
if (!customer) return res.status(404).json({ message: 'Customer not found' });
res.json(customer);
} catch (err) {
res.status(500).json({ message: err.message });
}
});


// Update a customer by ID
router.put('/:id', async (req, res) => {
try {
const updatedCustomer = await CustomerB2C.findByIdAndUpdate(req.params.id, req.body, { new: true });
if (!updatedCustomer) return res.status(404).json({ message: 'Customer not found' });
res.json(updatedCustomer);
} catch (err) {
res.status(400).json({ message: err.message });
}
});


// Delete a customer by ID
router.delete('/:id', async (req, res) => {
try {
const deletedCustomer = await CustomerB2C.findByIdAndDelete(req.params.id);
if (!deletedCustomer) return res.status(404).json({ message: 'Customer not found' });
res.json({ message: 'Customer deleted successfully' });
} catch (err) {
res.status(500).json({ message: err.message });
}
});


module.exports = router;