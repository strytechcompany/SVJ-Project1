const express = require("express");
const router = express.Router();
const SuspenseTransaction = require("../models/SuspenseTransaction");

// --------------------------------------
// CREATE Suspense Transaction  (POST)
// --------------------------------------
router.post("/", async (req, res) => {
  try {
    const transaction = new SuspenseTransaction(req.body);
    await transaction.save();

    res.status(201).json({
      message: "Transaction added successfully",
      data: transaction,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// --------------------------------------
// GET All Suspense Transactions
// --------------------------------------
router.get("/", async (req, res) => {
  try {
    const transactions = await SuspenseTransaction.find().sort({
      createdAt: -1,
    });

    res.json({ count: transactions.length, transactions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --------------------------------------
// GET Single Transaction by ID
// --------------------------------------
router.get("/:id", async (req, res) => {
  try {
    const transaction = await SuspenseTransaction.findById(req.params.id);

    if (!transaction)
      return res.status(404).json({ error: "Transaction not found" });

    res.json(transaction);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --------------------------------------
// UPDATE Suspense Transaction
// --------------------------------------
router.put("/:id", async (req, res) => {
  try {
    const updated = await SuspenseTransaction.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!updated)
      return res.status(404).json({ error: "Transaction not found" });

    res.json({ message: "Transaction updated", data: updated });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// --------------------------------------
// DELETE Suspense Transaction
// --------------------------------------
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await SuspenseTransaction.findByIdAndDelete(req.params.id);

    if (!deleted)
      return res.status(404).json({ error: "Transaction not found" });

    res.json({ message: "Transaction deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
