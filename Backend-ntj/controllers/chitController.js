const Chit = require('../models/Chit');

const getNextGroupCode = async () => {
    const count = await Chit.countDocuments();
    return `SVJ${String(count + 1).padStart(3, '0')}`;
};

const getNextReceiptNo = async () => {
    const allChits = await Chit.find({}, 'payments');
    const total = allChits.reduce((sum, c) => sum + (c.payments?.length || 0), 0);
    return total + 1;
};

const createChit = async (req, res) => {
    try {
        const { customerName, phone, address, monthlyAmount, goldRate, months } = req.body;
        if (!customerName || !phone || !monthlyAmount || !goldRate) {
            return res.status(400).json({ message: 'customerName, phone, monthlyAmount and goldRate are required.' });
        }
        const calculatedWeight = parseFloat((monthlyAmount / goldRate).toFixed(4));
        const groupCode = await getNextGroupCode();
        const chit = new Chit({ groupCode, customerName, phone, address, monthlyAmount, goldRate, calculatedWeight, months: months || 12 });
        const saved = await chit.save();
        res.status(201).json(saved);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

const getChits = async (req, res) => {
    try {
        const chits = await Chit.find().sort({ createdAt: -1 });
        res.json(chits);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const getChitById = async (req, res) => {
    try {
        const chit = await Chit.findById(req.params.id);
        if (!chit) return res.status(404).json({ message: 'Chit not found' });
        res.json(chit);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const addPayment = async (req, res) => {
    try {
        const { amount, goldRate, date } = req.body;
        if (!amount || !goldRate) {
            return res.status(400).json({ message: 'amount and goldRate are required.' });
        }
        const chit = await Chit.findById(req.params.id);
        if (!chit) return res.status(404).json({ message: 'Chit not found' });

        const receiptNo = await getNextReceiptNo();
        const calWeight = parseFloat((amount / goldRate).toFixed(4));
        const newInstallmentNo = chit.installmentNo + 1;
        const newTotalWeight = parseFloat((chit.totalWeight + calWeight).toFixed(4));

        const payment = {
            receiptNo,
            installmentNo: newInstallmentNo,
            amount: parseFloat(amount),
            goldRate: parseFloat(goldRate),
            calWeight,
            totalWeight: newTotalWeight,
            date: date || new Date().toLocaleDateString('en-GB'),
        };

        chit.payments.push(payment);
        chit.installmentNo = newInstallmentNo;
        chit.totalWeight = newTotalWeight;

        const updated = await chit.save();
        res.json({ chit: updated, payment: updated.payments[updated.payments.length - 1] });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

const updateChit = async (req, res) => {
    try {
        const { customerName, phone, monthlyAmount, months } = req.body;
        const chit = await Chit.findById(req.params.id);
        if (!chit) return res.status(404).json({ message: 'Chit not found' });

        if (customerName !== undefined) chit.customerName = customerName;
        if (phone !== undefined) chit.phone = phone;
        if (monthlyAmount !== undefined) {
            chit.monthlyAmount = parseFloat(monthlyAmount);
            chit.calculatedWeight = parseFloat((chit.monthlyAmount / chit.goldRate).toFixed(4));
        }
        if (months !== undefined) {
            const n = parseInt(months, 10);
            if (Number.isFinite(n) && n > 0) chit.months = n;
        }

        const updated = await chit.save();
        res.json(updated);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

const deleteChit = async (req, res) => {
    try {
        const deleted = await Chit.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ message: 'Chit not found' });
        res.json({ message: 'Chit deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

module.exports = { createChit, getChits, getChitById, addPayment, updateChit, deleteChit };
