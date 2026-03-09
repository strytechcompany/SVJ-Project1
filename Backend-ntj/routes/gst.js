const express = require("express");
const router = express.Router();
const GST = require("../models/gst");

// CREATE new GST record
router.post("/add", async (req, res) => {
  try {
    const newGST = new GST(req.body);
    await newGST.save();
    return res.json({ success: true, message: "GST record added", data: newGST });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET all GST records
router.get("/", async (req, res) => {
  try {
    const list = await GST.find().sort({ createdAt: -1 });
    return res.json(list);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET single GST record
router.get("/:id", async (req, res) => {
  try {
    const item = await GST.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Not found" });
    return res.json(item);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// UPDATE record
router.put("/:id", async (req, res) => {
  try {
    const updated = await GST.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    return res.json({ success: true, data: updated });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const deleted = await GST.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.json({ success: false, message: "Record not found" });
    }
    return res.json({ success: true, message: "Record deleted" });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
