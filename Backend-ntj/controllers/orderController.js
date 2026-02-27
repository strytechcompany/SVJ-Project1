const Order = require('../models/Order');

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

        const newOrder = new Order({
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
