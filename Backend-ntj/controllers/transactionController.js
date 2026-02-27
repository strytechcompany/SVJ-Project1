const Transaction = require('../models/transaction.js');

// @desc    Fetch all transactions
// @route   GET /api/transactions
const getTransactions = async (req, res) => {
    try {
        const transactions = await Transaction.find().sort({ createdAt: -1 });
        res.status(200).json(transactions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// @desc    Create a transaction
// @route   POST /api/transactions
const createTransaction = async (req, res) => {
    try {
        const transaction = new Transaction({
            customerName: req.body.customerName,
            customerId: req.body.customerId,
            issueTotal: req.body.issueTotal,
            issuePure: req.body.issuePure,
            oldBalance: req.body.oldBalance,
            receiptPure: req.body.receiptPure,
            cashPure: req.body.cashPure,
            balance: req.body.balance,
            advBal: req.body.advBal
        });

        const saved = await transaction.save();
        res.status(201).json(saved);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

// @desc    Fetch the last transaction
// @route   GET /api/transactions/last
const getLastTransaction = async (req, res) => {
    try {
        const lastTransaction = await Transaction.findOne().sort({ createdAt: -1 });
        if (!lastTransaction) {
            return res.status(404).json({ error: "No transactions found" });
        }
        res.status(200).json(lastTransaction);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = {
    getTransactions,
    createTransaction,
    getLastTransaction,
};
