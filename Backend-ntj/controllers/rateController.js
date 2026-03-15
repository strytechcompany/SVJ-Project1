const Rate = require("../models/Rate");

// @desc    Get latest rate
// @route   GET /api/rates
// @access  Public (or Private)
const getRate = async (req, res) => {
    try {
        const rate = await Rate.findOne().sort({ createdAt: -1 });
        if (!rate) return res.status(404).json({ message: "No rates found" });
        res.json(rate);
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

// @desc    Save new rate
// @route   POST /api/rates
// @access  Private
const createRate = async (req, res) => {
    try {
        const { goldRate, goldDate, ftRate, ftDate } = req.body;
        const newRate = new Rate({ goldRate, goldDate, ftRate, ftDate });
        const saved = await newRate.save();
        res.status(201).json(saved);
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

// @desc    Update latest rate
// @route   PUT /api/rates
// @access  Private
const updateRate = async (req, res) => {
    try {
        const { goldRate, goldDate, ftRate, ftDate } = req.body;
        const updated = await Rate.findOneAndUpdate(
            {},
            { goldRate, goldDate, ftRate, ftDate },
            { sort: { createdAt: -1 }, new: true, upsert: true }
        );
        res.json(updated);
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

module.exports = {
    getRate,
    createRate,
    updateRate,
};
