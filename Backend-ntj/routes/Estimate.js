const express = require("express");
const router = express.Router();
const Estimate = require("../models/Estimate");

// GET all estimates
router.get("/", async (req, res) => {
  try {
    const estimates = await Estimate.find().sort({ createdAt: -1 });
    res.json(estimates);
  } catch (err) {
    console.error("Error fetching estimates:", err);
    res.status(500).json({ message: "Server Error" });
  }
});

// GET single estimate by ID
router.get("/:id", async (req, res) => {
  try {
    const estimate = await Estimate.findById(req.params.id);
    if (!estimate) return res.status(404).json({ message: "Estimate not found" });
    res.json(estimate);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
});

// POST create new estimate
router.post("/", async (req, res) => {
  const {
    itemName,
    weight,
    wastagePercent,
    grossWeight,
    goldRate,
    netAmount,
    gst,
    totalAmount,
  } = req.body;

  if (!itemName || !weight || !grossWeight || !goldRate || !netAmount || !gst || !totalAmount) {
    return res.status(400).json({ message: "All required fields must be provided" });
  }

  try {
    const newEstimate = new Estimate({
      itemName,
      weight,
      wastagePercent,
      grossWeight,
      goldRate,
      netAmount,
      gst,
      totalAmount,
    });

    const savedEstimate = await newEstimate.save();
    res.status(201).json(savedEstimate);
  } catch (err) {
    console.error("Error creating estimate:", err);
    res.status(500).json({ message: "Server Error" });
  }
});

// PUT update estimate by ID
router.put("/:id", async (req, res) => {
  try {
    const estimate = await Estimate.findById(req.params.id);
    if (!estimate) return res.status(404).json({ message: "Estimate not found" });

    Object.assign(estimate, req.body); // update all fields provided
    const updatedEstimate = await estimate.save();
    res.json(updatedEstimate);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
});

// DELETE estimate by ID
router.delete("/:id", async (req, res) => {
  try {
    const estimate = await Estimate.findByIdAndDelete(req.params.id);
    if (!estimate) return res.status(404).json({ message: "Estimate not found" });
    res.json({ message: "Estimate deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
});

module.exports = router;
