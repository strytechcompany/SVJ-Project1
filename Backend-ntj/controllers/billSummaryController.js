const BillSummary = require('../models/BillSummary');

const createBillSummary = async (req, res) => {
    try {
        const bill = new BillSummary(req.body);
        const saved = await bill.save();
        res.status(201).json(saved);
    } catch (error) {
        res.status(500).json({ message: 'Failed to save bill summary', error: error.message });
    }
};

const getBillSummaries = async (req, res) => {
    try {
        const bills = await BillSummary.find().sort({ createdAt: -1 });
        res.json(bills);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch bill summaries', error: error.message });
    }
};

const getBillsByCustomerId = async (req, res) => {
    try {
        const bills = await BillSummary.find({ customerId: req.params.customerId }).sort({ createdAt: -1 });
        res.json(bills);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch customer bills', error: error.message });
    }
};

const getBillSummaryById = async (req, res) => {
    try {
        const bill = await BillSummary.findById(req.params.id);
        if (!bill) return res.status(404).json({ message: 'Bill not found' });
        res.json(bill);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch bill summary', error: error.message });
    }
};

const updateBillSummary = async (req, res) => {
    try {
        const updated = await BillSummary.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updated) return res.status(404).json({ message: 'Bill not found' });
        res.json(updated);
    } catch (error) {
        res.status(500).json({ message: 'Failed to update bill summary', error: error.message });
    }
};

const deleteBillSummary = async (req, res) => {
    try {
        const deleted = await BillSummary.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ message: 'Bill not found' });
        res.json({ message: 'Bill deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete bill summary', error: error.message });
    }
};

module.exports = {
    createBillSummary,
    getBillSummaries,
    getBillsByCustomerId,
    getBillSummaryById,
    updateBillSummary,
    deleteBillSummary,
};
