const Order = require('../models/Order');
const BillCounter = require('../models/BillCounter');

// @desc    Create new order
// @route   POST /api/orders
const createOrder = async (req, res) => {
    try {
        const {
            itemName, itemWeight, customerName, mobileNumber,
            paymentType, amount, balanceAmount, deliveryDate,
            status, assignedDealer, assignedDealerName, image,
        } = req.body;

        if (!itemName || itemWeight == null || !customerName || !mobileNumber) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const orderCounter = await BillCounter.findOneAndUpdate(
            { key: 'order' },
            { $inc: { counter: 1 } },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );
        const orderNo = String(orderCounter.counter).padStart(2, '0');

        const newOrder = new Order({
            orderNo,
            itemName,
            itemWeight,
            customerName,
            mobileNumber,
            paymentType,
            amount: amount || 0,
            balanceAmount: balanceAmount || 0,
            deliveryDate: deliveryDate || null,
            status: status || 'Pending',
            assignedDealer: assignedDealer || null,
            assignedDealerName: assignedDealerName || null,
            assignedAt: status === "Assigned" ? new Date() : null,
            image: image || null,
        });

        const savedOrder = await newOrder.save();
        res.status(201).json({ message: 'Order created successfully', order: savedOrder });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Get all orders
// @route   GET /api/orders
const getOrders = async (req, res) => {
    try {
        // Automatic Reversion Logic: Check for 'Assigned' orders older than 2 days
        const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

        // Find assigned orders that were assigned over 2 days ago
        const overDueAssigned = await Order.find({
            status: "Assigned",
            assignedAt: { $lt: twoDaysAgo }
        });

        if (overDueAssigned.length > 0) {
            console.log(`Reverting ${overDueAssigned.length} overdue assigned orders to Pending.`);
            await Order.updateMany(
                { status: "Assigned", assignedAt: { $lt: twoDaysAgo } },
                { $set: { status: "Pending", assignedDealer: null, assignedDealerName: null, assignedAt: null } }
            );
        }

        const orders = await Order.find().sort({ createdAt: -1 });
        res.status(200).json(orders);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Get order by ID
// @route   GET /api/orders/:id
const getOrderById = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ message: 'Order not found' });
        res.status(200).json(order);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Update order
// @route   PUT /api/orders/:id
const updateOrder = async (req, res) => {
    try {
        const {
            itemName, itemWeight, customerName, mobileNumber,
            paymentType, amount, balanceAmount, deliveryDate,
            status, assignedDealer, assignedDealerName, image,
        } = req.body;

        const updateData = {
            ...(itemName && { itemName }),
            ...(itemWeight != null && { itemWeight }),
            ...(customerName && { customerName }),
            ...(mobileNumber && { mobileNumber }),
            ...(paymentType && { paymentType }),
            ...(amount != null && { amount }),
            ...(balanceAmount != null && { balanceAmount }),
            ...(deliveryDate && { deliveryDate }),
            ...(status && { status }),
            ...(assignedDealer !== undefined && { assignedDealer }),
            ...(assignedDealerName !== undefined && { assignedDealerName }),
            ...(image !== undefined && { image }),
        };

        // If status is specifically set to "Assigned", record the time
        if (status === "Assigned") {
            updateData.assignedAt = new Date();
        } else if (status === "Pending") {
            // If explicitly set back to Pending, or if it's the result of an update, clear assigned data
            updateData.assignedDealer = null;
            updateData.assignedDealerName = null;
            updateData.assignedAt = null;
        }

        const updatedOrder = await Order.findByIdAndUpdate(
            req.params.id, updateData, { new: true, runValidators: true }
        );

        if (!updatedOrder) return res.status(404).json({ message: 'Order not found' });

        res.status(200).json({ message: 'Order updated successfully', order: updatedOrder });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Delete order
// @route   DELETE /api/orders/:id
const deleteOrder = async (req, res) => {
    try {
        const order = await Order.findByIdAndDelete(req.params.id);
        if (!order) return res.status(404).json({ message: 'Order not found' });
        res.status(200).json({ message: 'Order deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

module.exports = {
    createOrder,
    getOrders,
    getOrderById,
    updateOrder,
    deleteOrder,
};
