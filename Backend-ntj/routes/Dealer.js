const express = require("express");
const router = express.Router();
const Dealer = require("../models/Dealer");

// Create a new Dealer
router.post("/", async (req, res) => {
  try {
    const {
      customerName,
      phoneNumber,
      emailId,
      shopName,
      gstin,
      address,
      oldBalance,
      advanceBalance,
      customerType,
      workerName,
    } = req.body;

    // Validate required fields
    if (!customerName || !phoneNumber) {
      return res.status(400).json({ message: "Customer name and phone number are required." });
    }

    const newDealer = new Dealer({
      customerName,
      phoneNumber,
      gstin,
      address,
      oldBalance: oldBalance || 0,
      advanceBalance: advanceBalance || 0,
      customerType: customerType || "Dealer",
      workerName: workerName || "",
    });

    const savedDealer = await newDealer.save();
    res.status(201).json(savedDealer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error while creating dealer" });
  }
});

// Get all Dealers
router.get("/", async (req, res) => {
  try {
    const dealers = await Dealer.find().sort({ createdAt: -1 });
    res.json(dealers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error while fetching dealers" });
  }
});

// Get a single Dealer by ID
router.get("/:id", async (req, res) => {
  try {
    const dealer = await Dealer.findById(req.params.id);
    if (!dealer) {
      return res.status(404).json({ message: "Dealer not found" });
    }
    res.json(dealer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error while fetching dealer" });
  }
});

// Update a Dealer by ID
router.put("/:id", async (req, res) => {
  try {
    const updatedDealer = await Dealer.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updatedDealer) {
      return res.status(404).json({ message: "Dealer not found" });
    }

    res.json(updatedDealer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error while updating dealer" });
  }
});

// Delete a Dealer by ID
router.delete("/:id", async (req, res) => {
  try {
    const deletedDealer = await Dealer.findByIdAndDelete(req.params.id);
    if (!deletedDealer) {
      return res.status(404).json({ message: "Dealer not found" });
    }
    res.json({ message: "Dealer deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error while deleting dealer" });
  }
});

module.exports = router;
