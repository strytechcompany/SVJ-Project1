const express = require('express');
const router = express.Router();
const BillSummary = require('../models/BillSummary');

// ─────────────────────────────────────────────
// POST /api/billSummary  →  Create new bill
// ─────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const bill = new BillSummary(req.body);
    const saved = await bill.save();
    res.status(201).json(saved);
  } catch (error) {
    console.error('❌ Error saving bill summary:', error.message);
    res.status(500).json({ message: 'Failed to save bill summary', error: error.message });
  }
});

// ─────────────────────────────────────────────
// GET /api/billSummary  →  All bills
// ─────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const bills = await BillSummary.find().sort({ createdAt: -1 });
    res.json(bills);
  } catch (error) {
    console.error('❌ Error fetching bill summaries:', error.message);
    res.status(500).json({ message: 'Failed to fetch bill summaries', error: error.message });
  }
});

// ─────────────────────────────────────────────
// ✅ GET /api/billSummary/customer/:customerId
// MUST be before /:id to avoid route conflict
// ─────────────────────────────────────────────
router.get('/customer/:customerId', async (req, res) => {
  try {
    const bills = await BillSummary.find({ customerId: req.params.customerId }).sort({ createdAt: -1 });
    res.json(bills);
  } catch (error) {
    console.error('❌ Error fetching customer bills:', error.message);
    res.status(500).json({ message: 'Failed to fetch customer bills', error: error.message });
  }
});

// ─────────────────────────────────────────────
// GET /api/billSummary/:id  →  Single bill
// MUST be after /customer/:customerId
// ─────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const bill = await BillSummary.findById(req.params.id);
    if (!bill) return res.status(404).json({ message: 'Bill not found' });
    res.json(bill);
  } catch (error) {
    console.error('❌ Error fetching bill summary:', error.message);
    res.status(500).json({ message: 'Failed to fetch bill summary', error: error.message });
  }
});

// ─────────────────────────────────────────────
// PUT /api/billSummary/:id  →  Update bill
// ─────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const updated = await BillSummary.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ message: 'Bill not found' });
    res.json(updated);
  } catch (error) {
    console.error('❌ Error updating bill summary:', error.message);
    res.status(500).json({ message: 'Failed to update bill summary', error: error.message });
  }
});

// ─────────────────────────────────────────────
// DELETE /api/billSummary/:id  →  Delete bill
// ─────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await BillSummary.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Bill not found' });
    res.json({ message: 'Bill deleted successfully' });
  } catch (error) {
    console.error('❌ Error deleting bill summary:', error.message);
    res.status(500).json({ message: 'Failed to delete bill summary', error: error.message });
  }
});

module.exports = router;