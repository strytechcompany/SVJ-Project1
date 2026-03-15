const CustomerB2C = require('../models/CustomerB2C');

const { getBillSummaryModel } = require('../models/BillSummary');

const toSafeNumber = (value, fallback = 0) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
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

        const updated = await CustomerB2C.findByIdAndUpdate(
            req.params.id,
            {
                $set: {
                    oldBalance: safeOB,
                    advanceBalance: safeAB,
                    availableBalance: safeOB - safeAB,
                    billCurrentBalance: safeOB - safeAB,
                    lastTransactionDate: new Date(),
                    lastTransactionType: 'B2C',
                }
            },
            { new: true, runValidators: false }
        );

        if (!updated) return res.status(404).json({ message: 'Customer not found' });

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
        const customer = await CustomerB2C.findById(req.params.id);
        if (!customer) return res.status(404).json({ message: 'Customer not found' });
        res.json(customer);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const updateCustomerB2C = async (req, res) => {
    try {
        const updatedCustomer = await CustomerB2C.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updatedCustomer) return res.status(404).json({ message: 'Customer not found' });
        res.json(updatedCustomer);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

const deleteCustomerB2C = async (req, res) => {
    try {
        const deletedCustomer = await CustomerB2C.findByIdAndDelete(req.params.id);
        if (!deletedCustomer) return res.status(404).json({ message: 'Customer not found' });
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
