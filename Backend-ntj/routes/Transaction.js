// routes/transactionRoutes.js
const mongoose = require('mongoose');
const express = require('express');
const Transaction = require('../models/transaction.js'); // note capital T

const router = express.Router();

// GET /api/transactions - Fetch all transactions
router.get("/", async (req, res) => {
  try {
    const transactions = await Transaction.find().sort({ createdAt: -1 });
    res.status(200).json(transactions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/transactions
router.post("/", async (req, res) => {
  try {
    const transaction = new Transaction({
      customerName: req.body.customerName,
      customerId: req.body.customerId,
      issueTotal: req.body.issueTotal,
      issuePure: req.body.issuePure,
      oldBalance: req.body.oldBalance,
      receiptPure: req.body.receiptPure,
      cashPure: req.body.cashPure,
      balance: req.body.balance,
      advBal: req.body.advBal
    });

    const saved = await transaction.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/transactions/last - Fetch the last transaction
router.get("/last", async (req, res) => {
  try {
    const lastTransaction = await Transaction.findOne().sort({ createdAt: -1 });
    if (!lastTransaction) {
      return res.status(404).json({ error: "No transactions found" });
    }
    res.status(200).json(lastTransaction);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CommonJS export
module.exports = router;
