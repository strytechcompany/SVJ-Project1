const Purchase = require("../models/Purchase");

const createPurchase = async (req, res) => {
    try {
        const { supplier, supplierName, issueItem, issueItemName, receiptItem, receiptItemName, cash, date } = req.body;

        if (!supplier && !issueItem && !receiptItem && !cash) {
            return res.status(400).json({ message: "At least one field (supplier, issue item, receipt item, or cash) must be filled" });
        }

        if (!date) return res.status(400).json({ message: "Date is required" });

        const newPurchase = new Purchase({
            supplier, supplierName, issueItem, issueItemName, receiptItem, receiptItemName, cash: cash || 0, date
        });

        const savedPurchase = await newPurchase.save();
        res.status(201).json({ message: "Purchase created successfully", purchase: savedPurchase });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

const getPurchases = async (req, res) => {
    try {
        const { startDate, endDate, supplier } = req.query;
        let filter = {};
        if (supplier) filter.supplier = supplier;
        if (startDate && endDate) filter.date = { $gte: startDate, $lte: endDate };

        const purchases = await Purchase.find(filter)
            .populate("supplier", "customerName shopName phoneNumber")
            .populate("issueItem", "stockName itemDetails")
            .populate("receiptItem", "stockName itemDetails")
            .sort({ createdAt: -1 });

        res.json(purchases);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

const getPurchaseById = async (req, res) => {
    try {
        const purchase = await Purchase.findById(req.params.id)
            .populate("supplier", "customerName shopName phoneNumber")
            .populate("issueItem", "stockName itemDetails")
            .populate("receiptItem", "stockName itemDetails");

        if (!purchase) return res.status(404).json({ message: "Purchase not found" });
        res.json(purchase);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

const updatePurchase = async (req, res) => {
    try {
        const updatedPurchase = await Purchase.findByIdAndUpdate(
            req.params.id, req.body, { new: true, runValidators: true }
        )
            .populate("supplier", "customerName shopName phoneNumber")
            .populate("issueItem", "stockName itemDetails")
            .populate("receiptItem", "stockName itemDetails");

        if (!updatedPurchase) return res.status(404).json({ message: "Purchase not found" });
        res.json({ message: "Purchase updated successfully", purchase: updatedPurchase });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

const deletePurchase = async (req, res) => {
    try {
        const deletedPurchase = await Purchase.findByIdAndDelete(req.params.id);
        if (!deletedPurchase) return res.status(404).json({ message: "Purchase not found" });
        res.json({ message: "Purchase deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

module.exports = {
    createPurchase,
    getPurchases,
    getPurchaseById,
    updatePurchase,
    deletePurchase,
};
