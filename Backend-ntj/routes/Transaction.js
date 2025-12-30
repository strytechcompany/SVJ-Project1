// routes/transactionRoutes.js
const mongoose = require('mongoose');
const express = require('express');
const Transaction = require('../models/transaction.js'); // note capital T

const router = express.Router();

// POST /api/transactions
router.post("/", async (req, res) => {
  try {
    const transaction = new Transaction({
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

// CommonJS export
module.exports = router;
