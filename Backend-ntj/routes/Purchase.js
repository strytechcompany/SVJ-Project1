const express = require("express");
const router = express.Router();
const Purchase = require("../models/Purchase");

// CREATE NEW PURCHASE
router.post("/", async (req, res) => {
  try {
    const {
      supplier,
      supplierName,
      issueItem,
      issueItemName,
      receiptItem,
      receiptItemName,
      cash,
      date,
    } = req.body;

    // Validate that at least one field is filled
    if (!supplier && !issueItem && !receiptItem && !cash) {
      return res.status(400).json({
        message: "At least one field (supplier, issue item, receipt item, or cash) must be filled",
      });
    }

    // Validate date
    if (!date) {
      return res.status(400).json({ message: "Date is required" });
    }

    const newPurchase = new Purchase({
      supplier: supplier || null,
      supplierName: supplierName || "",
      issueItem: issueItem || null,
      issueItemName: issueItemName || "",
      receiptItem: receiptItem || null,
      receiptItemName: receiptItemName || "",
      cash: cash || 0,
      date,
    });

    const savedPurchase = await newPurchase.save();

    res.status(201).json({
      message: "Purchase created successfully",
      purchase: savedPurchase,
    });
  } catch (error) {
    console.error("Error creating purchase:", error);
    res.status(500).json({
      message: "Server error while creating purchase",
      error: error.message,
    });
  }
});

// GET ALL PURCHASES
router.get("/", async (req, res) => {
  try {
    const { startDate, endDate, supplier } = req.query;

    // Build filter object
    let filter = {};

    if (supplier) {
      filter.supplier = supplier;
    }

    if (startDate && endDate) {
      filter.date = { $gte: startDate, $lte: endDate };
    }

    const purchases = await Purchase.find(filter)
      .populate("supplier", "customerName shopName phoneNumber")
      .populate("issueItem", "stockName itemDetails")
      .populate("receiptItem", "stockName itemDetails")
      .sort({ createdAt: -1 });

    res.status(200).json(purchases);
  } catch (error) {
    console.error("Error fetching purchases:", error);
    res.status(500).json({
      message: "Server error while fetching purchases",
      error: error.message,
    });
  }
});

// GET PURCHASE BY ID
router.get("/:id", async (req, res) => {
  try {
    const purchase = await Purchase.findById(req.params.id)
      .populate("supplier", "customerName shopName phoneNumber")
      .populate("issueItem", "stockName itemDetails")
      .populate("receiptItem", "stockName itemDetails");

    if (!purchase) {
      return res.status(404).json({ message: "Purchase not found" });
    }

    res.status(200).json(purchase);
  } catch (error) {
    console.error("Error fetching purchase:", error);
    res.status(500).json({
      message: "Server error while fetching purchase",
      error: error.message,
    });
  }
});

// UPDATE PURCHASE BY ID
router.put("/:id", async (req, res) => {
  try {
    const {
      supplier,
      supplierName,
      issueItem,
      issueItemName,
      receiptItem,
      receiptItemName,
      cash,
      date,
    } = req.body;

    const updatedPurchase = await Purchase.findByIdAndUpdate(
      req.params.id,
      {
        supplier: supplier || null,
        supplierName: supplierName || "",
        issueItem: issueItem || null,
        issueItemName: issueItemName || "",
        receiptItem: receiptItem || null,
        receiptItemName: receiptItemName || "",
        cash: cash || 0,
        date,
      },
      { new: true, runValidators: true }
    )
      .populate("supplier", "customerName shopName phoneNumber")
      .populate("issueItem", "stockName itemDetails")
      .populate("receiptItem", "stockName itemDetails");

    if (!updatedPurchase) {
      return res.status(404).json({ message: "Purchase not found" });
    }

    res.status(200).json({
      message: "Purchase updated successfully",
      purchase: updatedPurchase,
    });
  } catch (error) {
    console.error("Error updating purchase:", error);
    res.status(500).json({
      message: "Server error while updating purchase",
      error: error.message,
    });
  }
});

// DELETE PURCHASE BY ID
router.delete("/:id", async (req, res) => {
  try {
    const deletedPurchase = await Purchase.findByIdAndDelete(req.params.id);

    if (!deletedPurchase) {
      return res.status(404).json({ message: "Purchase not found" });
    }

    res.status(200).json({ message: "Purchase deleted successfully" });
  } catch (error) {
    console.error("Error deleting purchase:", error);
    res.status(500).json({
      message: "Server error while deleting purchase",
      error: error.message,
    });
  }
});

module.exports = router;