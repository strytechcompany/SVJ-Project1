const express = require("express");
const router = express.Router();
const DailyExpense = require("../models/DailyExpense");

router.get("/", async (req, res) => {
  try {
    const rows = await DailyExpense.find().sort({ expenseDate: -1, createdAt: -1 });
    res.json(rows);
  } catch (error) {
    console.error("Error fetching daily expenses:", error);
    res.status(500).json({ message: "Failed to fetch daily expenses" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { expenseName, workerName, phoneNumber, amount, description } = req.body;

    const parsedAmount = Number(amount);
    if (!expenseName || !workerName || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({
        message: "expenseName, workerName and valid amount are required",
      });
    }

    const row = new DailyExpense({
      expenseName: String(expenseName).trim(),
      workerName: String(workerName).trim(),
      phoneNumber: String(phoneNumber || "").trim(),
      amount: parsedAmount,
      description: String(description || "").trim(),
      expenseDate: new Date(),
    });

    const saved = await row.save();
    res.status(201).json(saved);
  } catch (error) {
    console.error("Error creating daily expense:", error);
    res.status(500).json({ message: "Failed to create daily expense" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const deleted = await DailyExpense.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Expense not found" });
    }
    res.json({ message: "Expense deleted successfully" });
  } catch (error) {
    console.error("Error deleting daily expense:", error);
    res.status(500).json({ message: "Failed to delete daily expense" });
  }
});

module.exports = router;
