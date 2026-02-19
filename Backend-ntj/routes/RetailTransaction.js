// routes/RetailTransaction.js

const express = require("express");
const router = express.Router();
const RetailTransaction = require("../models/RetailTransaction");

// ➤ Add New Retail Transaction
router.post("/", async (req, res) => {
  try {
    const newTransaction = new RetailTransaction(req.body);
    await newTransaction.save();
    res.status(201).json({ message: "Transaction added successfully", data: newTransaction });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ➤ Get All Transactions
router.get("/", async (req, res) => {
  try {
    const transactions = await RetailTransaction.find().sort({ createdAt: -1 });
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ➤ Get Single Transaction by ID
router.get("/:id", async (req, res) => {
  try {
    const transaction = await RetailTransaction.findById(req.params.id);
    if (!transaction) return res.status(404).json({ message: "Transaction not found" });

    res.json(transaction);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ➤ Delete Transaction by ID
router.delete("/:id", async (req, res) => {
  try {
    const transaction = await RetailTransaction.findByIdAndDelete(req.params.id);
    if (!transaction) return res.status(404).json({ message: "Transaction not found" });

    res.json({ message: "Transaction deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
