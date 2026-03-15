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
  const toNum = (value, fallback = 0) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  };

  const {
    itemName,
    weight,
    wastagePercent,
    grossWeight,
    goldRate,
    netAmount,
    gst,
    totalAmount,
    items = [],
    enableGST = false,
    customerName,
    customerPhone,
  } = req.body || {};

  const normalizedItems = Array.isArray(items)
    ? items.map((it) => ({
      itemName: it?.itemName || "",
      weight: toNum(it?.weight, 0),
      wastagePercent: toNum(it?.wastagePercent, 0),
      grossWeight: toNum(it?.grossWeight, 0),
      goldRate: toNum(it?.goldRate, 0),
      netAmount: toNum(it?.netAmount, 0),
      gst: toNum(it?.gst, 0),
      totalAmount: toNum(it?.totalAmount, 0),
    }))
    : [];

  const hasItems = normalizedItems.length > 0;
  const safeItemName = hasItems
    ? (itemName || normalizedItems.map((it) => it.itemName).filter(Boolean).join(", "))
    : (itemName || "");

  const safeWeight = hasItems
    ? toNum(weight, normalizedItems.reduce((sum, it) => sum + toNum(it.weight, 0), 0))
    : toNum(weight, NaN);
  const safeGrossWeight = hasItems
    ? toNum(grossWeight, normalizedItems.reduce((sum, it) => sum + toNum(it.grossWeight, 0), 0))
    : toNum(grossWeight, NaN);
  const safeNetAmount = hasItems
    ? toNum(netAmount, normalizedItems.reduce((sum, it) => sum + toNum(it.netAmount, 0), 0))
    : toNum(netAmount, NaN);
  const safeGst = hasItems
    ? toNum(gst, normalizedItems.reduce((sum, it) => sum + toNum(it.gst, 0), 0))
    : toNum(gst, NaN);
  const safeTotalAmount = hasItems
    ? toNum(totalAmount, normalizedItems.reduce((sum, it) => sum + toNum(it.totalAmount, 0), 0))
    : toNum(totalAmount, NaN);
  const safeGoldRate = hasItems
    ? toNum(goldRate, normalizedItems[0]?.goldRate || 0)
    : toNum(goldRate, NaN);
  const safeWastagePercent = hasItems
    ? toNum(wastagePercent, normalizedItems[0]?.wastagePercent || 0)
    : toNum(wastagePercent, 0);

  if (!safeItemName || !Number.isFinite(safeWeight) || !Number.isFinite(safeGrossWeight) || !Number.isFinite(safeGoldRate) || !Number.isFinite(safeNetAmount) || !Number.isFinite(safeGst) || !Number.isFinite(safeTotalAmount)) {
    return res.status(400).json({ message: "All required fields must be provided" });
  }

  try {
    const newEstimate = new Estimate({
      itemName: safeItemName,
      weight: safeWeight,
      wastagePercent: safeWastagePercent,
      grossWeight: safeGrossWeight,
      goldRate: safeGoldRate,
      netAmount: safeNetAmount,
      gst: safeGst,
      totalAmount: safeTotalAmount,
      items: normalizedItems,
      enableGST: Boolean(enableGST),
      customerName: customerName || "Estimate Customer",
      customerPhone: customerPhone || "N/A",
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
