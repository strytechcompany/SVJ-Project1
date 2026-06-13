const Payment = require('../models/Payment');
const Dealer = require('../models/Dealer');
const { applyOptionalLimit } = require('../utils/queryPerformance');

const getPayments = async (req, res) => {
    try {
        const paymentsQuery = Payment.find().sort({ createdAt: -1 }).lean();
        applyOptionalLimit(paymentsQuery, req.query.limit);
        const payments = await paymentsQuery;
        res.json(payments);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch payments' });
    }
};

const createPayment = async (req, res) => {
    try {
        const payment = new Payment(req.body);
        await payment.save();
        res.status(201).json(payment);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create payment' });
    }
};

const handleDealerTransfer = async (req, res) => {
    try {
        const { date, selectedDealer, selectedItems, totalSelectedWeight, weightSubtraction, transferWeight } = req.body;

        const dealerTransfer = new Payment({
            date, selectedDealer, selectedItems, totalSelectedWeight, weightSubtraction, transferWeight,
            type: 'dealerTransfer'
        });

        const dealerUpdatePromise = selectedDealer
            ? Dealer.findOneAndUpdate(
                { customerName: selectedDealer },
                {
                    $inc: {
                        advanceBalance: -(Number(transferWeight) || 0),
                        oldBalance: Number(transferWeight) || 0,
                    },
                },
                { new: true }
            )
            : Promise.resolve(null);

        await Promise.all([
            dealerTransfer.save(),
            dealerUpdatePromise,
        ]);

        res.status(201).json({ message: 'Dealer transfer processed successfully', dealerTransfer });
    } catch (error) {
        res.status(500).json({ error: 'Failed to process dealer transfer' });
    }
};

const getDealerTransferHistory = async (req, res) => {
    try {
        const dealerTransfersQuery = Payment.find({ type: 'dealerTransfer' }).sort({ createdAt: -1 }).lean();
        applyOptionalLimit(dealerTransfersQuery, req.query.limit);
        const dealerTransfers = await dealerTransfersQuery;
        res.json(dealerTransfers);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch dealer transfer history' });
    }
};

const getPaymentById = async (req, res) => {
    try {
        const payment = await Payment.findById(req.params.id);
        if (!payment) return res.status(404).json({ error: 'Payment not found' });
        res.json(payment);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch payment' });
    }
};

const updatePayment = async (req, res) => {
    try {
        const payment = await Payment.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!payment) return res.status(404).json({ error: 'Payment not found' });
        res.json(payment);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update payment' });
    }
};

const deletePayment = async (req, res) => {
    try {
        const payment = await Payment.findByIdAndDelete(req.params.id);
        if (!payment) return res.status(404).json({ error: 'Payment not found' });
        res.json({ message: 'Payment deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete payment' });
    }
};

module.exports = {
    getPayments,
    createPayment,
    handleDealerTransfer,
    getDealerTransferHistory,
    getPaymentById,
    updatePayment,
    deletePayment,
};
