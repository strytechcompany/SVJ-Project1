const Customer = require("../models/Customer");

const getCustomers = async (req, res) => {
    try {
        const customers = await Customer.find();
        res.json(customers);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};


const getCustomerById = async (req, res) => {
    try {
        const customer = await Customer.findById(req.params.id);
        if (!customer)
            return res.status(404).json({ message: "Customer not found" });
        res.json(customer);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};


const createCustomer = async (req, res) => {
    const {
        customerName,
        phoneNumber,
        shopName,
        address,
        oldBalance,
        advanceBalance,
        gstin,
    } = req.body;

    try {
        const exists = await Customer.findOne({
            customerName: customerName.trim(),
            shopName: shopName.trim(),
        });
        if (exists)
            return res.status(400).json({ message: "Customer already exists" });

        const customer = new Customer({
            customerName,
            phoneNumber,
            shopName,
            address,
            oldBalance: oldBalance || 0,
            advanceBalance: advanceBalance || 0,
            gstin: gstin || "",
            billCurrentBalance: 0,
            customerType: req.body.customerType || "B2B",
        });

        const newCustomer = await customer.save();
        res.status(201).json(newCustomer);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

// @desc    Update customer
// @route   PUT /api/customers/:id
const updateCustomer = async (req, res) => {
    try {
        if (req.params.id === "update-balance") {
            return updateCustomerBalanceByPhone(req, res);
        }

        const customer = await Customer.findById(req.params.id);
        if (!customer)
            return res.status(404).json({ message: "Customer not found" });

        const {
            customerName,
            phoneNumber,
            shopName,
            address,
            oldBalance,
            advanceBalance,
        gstin,
        billCurrentBalance,
        availableBalance,
        lastTransactionDate,
        lastTransactionType,
    } = req.body;

        if (customerName !== undefined) customer.customerName = customerName;
        if (phoneNumber !== undefined) customer.phoneNumber = phoneNumber;
        if (shopName !== undefined) customer.shopName = shopName;
        if (address !== undefined) customer.address = address;
        if (oldBalance !== undefined) customer.oldBalance = oldBalance;
        if (advanceBalance !== undefined) customer.advanceBalance = advanceBalance;
        if (gstin !== undefined) customer.gstin = gstin;
        if (billCurrentBalance !== undefined) customer.billCurrentBalance = billCurrentBalance;
        if (availableBalance !== undefined) customer.availableBalance = availableBalance;
        if (lastTransactionDate !== undefined) customer.lastTransactionDate = lastTransactionDate;
        if (lastTransactionType !== undefined) customer.lastTransactionType = lastTransactionType;
        if (req.body.customerType !== undefined) customer.customerType = req.body.customerType;

        // Additional fields from original route
        if (req.body.gstPercentage !== undefined) customer.gstPercentage = req.body.gstPercentage;
        if (req.body.gstAmount !== undefined) customer.gstAmount = req.body.gstAmount;
        if (req.body.sgst !== undefined) customer.sgst = req.body.sgst;
        if (req.body.cgst !== undefined) customer.cgst = req.body.cgst;
        if (req.body.igst !== undefined) customer.igst = req.body.igst;

        const updatedCustomer = await customer.save();
        res.json(updatedCustomer);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

// @desc    Update customer balances by phone
// @route   PUT /api/customers/update-balance
const updateCustomerBalanceByPhone = async (req, res) => {
    try {
        const phone = String(req.body.phone || req.body.phoneNumber || "").trim();
        const oldBalance = Number(req.body.oldBalance || 0);
        const advanceBalance = Number(req.body.advanceBalance || 0);

        if (!phone) {
            return res.status(400).json({ message: "Phone is required" });
        }

        const updatedCustomer = await Customer.findOneAndUpdate(
            { phoneNumber: phone },
            {
                $set: {
                    oldBalance,
                    advanceBalance,
                },
            },
            { new: true }
        );

        if (!updatedCustomer) {
            return res.status(404).json({ message: "Customer not found" });
        }

        res.json(updatedCustomer);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

// @desc    Delete customer
// @route   DELETE /api/customers/:id
const deleteCustomer = async (req, res) => {
    try {
        const customer = await Customer.findById(req.params.id);
        if (!customer)
            return res.status(404).json({ message: "Customer not found" });

        await customer.deleteOne();
        res.json({ message: "Customer deleted successfully" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Delete all B2B customers
// @route   DELETE /api/customers
const deleteAllB2BCustomers = async (req, res) => {
    try {
        const result = await Customer.deleteMany({
            $or: [
                { customerType: "B2B" },
                { customerType: { $exists: false } },
            ],
        });

        res.json({
            message: "All B2B customers deleted successfully",
            deletedCount: result.deletedCount || 0,
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

module.exports = {
    getCustomers,
    getCustomerById,
    createCustomer,
    updateCustomer,
    updateCustomerBalanceByPhone,
    deleteCustomer,
    deleteAllB2BCustomers,
};
 
