const UPI = require('../models/UPI');

const getUPIs = async (req, res) => {
    try {
        const upiIds = await UPI.find().sort({ createdAt: -1 });
        res.json({ upiIds });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

const createUPI = async (req, res) => {
    try {
        const { upiId } = req.body;
        if (!upiId) return res.status(400).json({ message: 'UPI ID is required' });
        const existing = await UPI.findOne({ upiId });
        if (existing) return res.status(400).json({ message: 'UPI ID already exists' });
        const newUPI = new UPI({ upiId });
        await newUPI.save();
        res.status(201).json({ message: 'UPI ID added', upi: newUPI });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

const selectPrimaryUPI = async (req, res) => {
    try {
        const { upiId } = req.body;
        if (!upiId) return res.status(400).json({ message: 'UPI ID is required' });
        await UPI.updateMany({}, { isPrimary: false });
        const updated = await UPI.findOneAndUpdate({ upiId }, { isPrimary: true }, { new: true });
        if (!updated) return res.status(404).json({ message: 'UPI ID not found' });
        res.json({ message: 'Primary UPI ID updated', upi: updated });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

const updateUPI = async (req, res) => {
    try {
        const { upiId } = req.body;
        const updated = await UPI.findByIdAndUpdate(req.params.id, { upiId }, { new: true });
        if (!updated) return res.status(404).json({ message: 'UPI ID not found' });
        res.json({ message: 'UPI ID updated', upi: updated });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

const deleteUPI = async (req, res) => {
    try {
        const deleted = await UPI.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ message: 'UPI ID not found' });
        res.json({ message: 'UPI ID deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    getUPIs,
    createUPI,
    selectPrimaryUPI,
    updateUPI,
    deleteUPI,
};
