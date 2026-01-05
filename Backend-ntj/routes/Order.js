const express = require('express');
const router = express.Router();
const Order = require('../models/Order');

// CREATE NEW ORDER
router.post('/', async (req, res) => {
  try {
    const { itemName, itemWeight, customerName, mobileNumber, paymentType } = req.body;

    if (!itemName || itemWeight == null || !customerName || !mobileNumber) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const newOrder = new Order({
      itemName,
      itemWeight,
      customerName,
      mobileNumber,
      paymentType, // <-- include payment type
    });

    const savedOrder = await newOrder.save();
    res.status(201).json({ message: 'Order created successfully', order: savedOrder });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET ALL ORDERS
router.get('/', async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.status(200).json(orders);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET ORDER BY ID
router.get('/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.status(200).json(order);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// UPDATE ORDER BY ID
router.put('/:id', async (req, res) => {
  try {
    const { itemName, itemWeight, customerName, mobileNumber, paymentType } = req.body;

    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id,
      { itemName, itemWeight, customerName, mobileNumber, paymentType },
      { new: true, runValidators: true }
    );

    if (!updatedOrder) return res.status(404).json({ message: 'Order not found' });

    res.status(200).json({ message: 'Order updated successfully', order: updatedOrder });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
