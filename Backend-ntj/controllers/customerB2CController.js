const mongoose = require('mongoose');
const CustomerB2C = require('../models/CustomerB2C');

const { getBillSummaryModel } = require('../models/BillSummary');

const toSafeNumber = (value, fallback = 0) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
};

const buildCustomerB2CQuery = (rawId) => {
    const value = String(rawId || '').trim();
    if (!value) return null;

    const numericId = Number(value);
    const orConditions = [];

    if (mongoose.Types.ObjectId.isValid(value)) {
        orConditions.push({ _id: value });
    }

    if (Number.isFinite(numericId)) {
        orConditions.push({ customerId: numericId });
    }

    if (orConditions.length === 0) {
        return null;
    }

    return orConditions.length === 1 ? orConditions[0] : { $or: orConditions };
};

const findCustomerB2CByAnyId = (rawId) => {
    const query = buildCustomerB2CQuery(rawId);
    if (!query) return Promise.resolve(null);
    return CustomerB2C.findOne(query);
};

// Dedicated endpoint for B2C Convert-to-Gold balance update
const patchB2CBalances = async (req, res) => {
    try {
        const { oldBalance, advanceBalance, billId } = req.body;
        const newOB = toSafeNumber(oldBalance, null);
        const newAB = toSafeNumber(advanceBalance, null);

        if (newOB === null || newAB === null) {
            return res.status(400).json({ message: 'oldBalance and advanceBalance are required numeric values' });
        }

        const safeOB = Math.max(0, newOB);
        const safeAB = Math.max(0, newAB);

        const customer = await findCustomerB2CByAnyId(req.params.id);
        if (!customer) return res.status(404).json({ message: 'Customer not found' });

        customer.oldBalance = safeOB;
        customer.advanceBalance = safeAB;
        customer.availableBalance = safeOB - safeAB;
        customer.billCurrentBalance = safeOB - safeAB;
        customer.lastTransactionDate = new Date();
        customer.lastTransactionType = 'B2C';

        const updated = await customer.save();

        // If a billId is provided, also atomically mark the bill as converted
        if (billId) {
            const BillModel = getBillSummaryModel('B2C');
            await BillModel.findByIdAndUpdate(billId, {
                $set: { isConvertedToGold: true }
            }).catch(e => console.error("Failed to mark bill as converted:", e.message));
        }

        res.json(updated);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

const createCustomerB2C = async (req, res) => {
    try {
        const customer = new CustomerB2C(req.body);
        const savedCustomer = await customer.save();
        res.status(201).json(savedCustomer);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

const getCustomersB2C = async (req, res) => {
    try {
        const customers = await CustomerB2C.find();
        res.json(customers);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const getCustomerB2CById = async (req, res) => {
    try {
        const customer = await findCustomerB2CByAnyId(req.params.id);
        if (!customer) return res.status(404).json({ message: 'Customer not found' });
        res.json(customer);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const updateCustomerB2C = async (req, res) => {
    try {
        const customer = await findCustomerB2CByAnyId(req.params.id);
        if (!customer) return res.status(404).json({ message: 'Customer not found' });

        Object.assign(customer, req.body);
        const updatedCustomer = await customer.save();
        res.json(updatedCustomer);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

const deleteCustomerB2C = async (req, res) => {
    try {
        const customer = await findCustomerB2CByAnyId(req.params.id);
        if (!customer) return res.status(404).json({ message: 'Customer not found' });

        await customer.deleteOne();
        res.json({ message: 'Customer deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

module.exports = {
    createCustomerB2C,
    getCustomersB2C,
    getCustomerB2CById,
    updateCustomerB2C,
    patchB2CBalances,
    deleteCustomerB2C,
};
