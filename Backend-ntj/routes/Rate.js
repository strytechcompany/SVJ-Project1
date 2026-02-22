const express = require("express");
const router = express.Router();
const Rate = require("../models/Rate");

// GET latest rate
router.get("/", async (req, res) => {
  try {
    console.log("GET /api/rates called");
    const rate = await Rate.findOne().sort({ createdAt: -1 });
    if (!rate) return res.status(404).json({ message: "No rates found" });
    console.log("Returning rate:", rate);
    res.json(rate);
  } catch (err) {
    console.error("GET /api/rates error:", err.message);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// POST - save new rate
router.post("/", async (req, res) => {
  try {
    console.log("POST /api/rates called with:", req.body);
    const { goldRate, goldDate, ftRate, ftDate } = req.body;
    const newRate = new Rate({ goldRate, goldDate, ftRate, ftDate });
    const saved = await newRate.save();
    console.log("New rate created:", saved);
    res.status(201).json(saved);
  } catch (err) {
    console.error("POST /api/rates error:", err.message);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// PUT - update latest rate (used by Save button)
router.put("/", async (req, res) => {
  try {
    console.log("PUT /api/rates called with:", req.body);
    const { goldRate, goldDate, ftRate, ftDate } = req.body;

    const updated = await Rate.findOneAndUpdate(
      {},
      { goldRate, goldDate, ftRate, ftDate },
      { sort: { createdAt: -1 }, new: true, upsert: true }
    );

    console.log("Rate updated in DB:", updated);
    res.json(updated);
  } catch (err) {
    console.error("PUT /api/rates error:", err.message);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;
