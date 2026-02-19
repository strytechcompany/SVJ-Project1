const express = require('express');
const Payment = require('../models/Payment');

const router = express.Router();

// Get all payments
router.get('/', async (req, res) => {
  try {
    const payments = await Payment.find().sort({ createdAt: -1 });
    res.json(payments);
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

// Create a new payment
router.post('/', async (req, res) => {
  try {
    const payment = new Payment(req.body);
    await payment.save();
    res.status(201).json(payment);
  } catch (error) {
    console.error('Error creating payment:', error);
    res.status(500).json({ error: 'Failed to create payment' });
  }
});

// Handle dealer transfer
router.post('/dealerTransferHistory', async (req, res) => {
  try {
    const { date, selectedDealer, selectedItems, totalSelectedWeight, weightSubtraction, transferWeight } = req.body;

    const dealerTransfer = new Payment({
      date,
      selectedDealer,
      selectedItems,
      totalSelectedWeight,
      weightSubtraction,
      transferWeight,
      type: 'dealerTransfer'
    });

    await dealerTransfer.save();

    if (selectedDealer) {
      const Dealer = require('../models/Dealer');
      const dealer = await Dealer.findOne({ customerName: selectedDealer });

      if (dealer) {
        dealer.advanceBalance = (dealer.advanceBalance || 0) - (transferWeight || 0);
        dealer.oldBalance = (dealer.oldBalance || 0) + (transferWeight || 0);
        await dealer.save();
      }
    }

    res.status(201).json({ message: 'Dealer transfer processed successfully', dealerTransfer });
  } catch (error) {
    console.error('Error processing dealer transfer:', error);
    res.status(500).json({ error: 'Failed to process dealer transfer' });
  }
});

// Get dealer transfer history
router.get('/dealerTransferHistory', async (req, res) => {
  try {
    const dealerTransfers = await Payment.find({ type: 'dealerTransfer' }).sort({ createdAt: -1 });
    res.json(dealerTransfers);
  } catch (error) {
    console.error('Error fetching dealer transfer history:', error);
    res.status(500).json({ error: 'Failed to fetch dealer transfer history' });
  }
});

// Get a specific payment by ID
router.get('/:id', async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    res.json(payment);
  } catch (error) {
    console.error('Error fetching payment:', error);
    res.status(500).json({ error: 'Failed to fetch payment' });
  }
});

// Update a payment
router.put('/:id', async (req, res) => {
  try {
    const payment = await Payment.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    res.json(payment);
  } catch (error) {
    console.error('Error updating payment:', error);
    res.status(500).json({ error: 'Failed to update payment' });
  }
});

// Delete a payment
router.delete('/:id', async (req, res) => {
  try {
    const payment = await Payment.findByIdAndDelete(req.params.id);
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    res.json({ message: 'Payment deleted successfully' });
  } catch (error) {
    console.error('Error deleting payment:', error);
    res.status(500).json({ error: 'Failed to delete payment' });
  }
});

module.exports = router;
