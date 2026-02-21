const express = require('express');
const router = express.Router();
const UPI = require('../models/UPI');

// GET all UPI IDs
router.get('/', async (req, res) => {
  try {
    const upiIds = await UPI.find().sort({ createdAt: -1 });
    res.json({ upiIds });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST add new UPI ID
router.post('/', async (req, res) => {
  try {
    const { upiId } = req.body;
    if (!upiId) return res.status(400).json({ message: 'UPI ID is required' });

    const existing = await UPI.findOne({ upiId });
    if (existing) return res.status(400).json({ message: 'UPI ID already exists' });

    const newUPI = new UPI({ upiId });
    await newUPI.save();
    res.status(201).json({ message: 'UPI ID added', upi: newUPI });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ✅ PUT select primary — MUST be before /:id
router.put('/select', async (req, res) => {
  try {
    const { upiId } = req.body;
    if (!upiId) return res.status(400).json({ message: 'UPI ID is required' });

    await UPI.updateMany({}, { isPrimary: false });
    const updated = await UPI.findOneAndUpdate(
      { upiId },
      { isPrimary: true },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: 'UPI ID not found' });

    res.json({ message: 'Primary UPI ID updated', upi: updated });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT update UPI ID by id — MUST be after /select
router.put('/:id', async (req, res) => {
  try {
    const { upiId } = req.body;
    if (!upiId) return res.status(400).json({ message: 'UPI ID is required' });

    const updated = await UPI.findByIdAndUpdate(
      req.params.id,
      { upiId },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: 'UPI ID not found' });

    res.json({ message: 'UPI ID updated', upi: updated });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE UPI ID by id
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await UPI.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'UPI ID not found' });
    res.json({ message: 'UPI ID deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
