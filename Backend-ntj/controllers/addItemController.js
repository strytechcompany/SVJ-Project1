const AddItem = require('../models/AddItem');

const createAddItem = async (req, res) => {
    try {
        const {
            customerName, invoiceNo, itemName, weight, touch, wm, rate, total, gst, final, modifiedWeight, stockMasterId, date,
            itemNumber, count, sriCost, sriBill, plus, purity
        } = req.body;

        const newItem = new AddItem({
            customerName, invoiceNo: invoiceNo || 'N/A', itemName, weight: modifiedWeight, touch, wm, rate, total, gst, final, modifiedWeight, stockMasterId, date,
            itemNumber, count, sriCost, sriBill, plus, purity
        });

        const savedItem = await newItem.save();
        res.status(201).json(savedItem);
    } catch (error) {
        res.status(500).json({ message: 'Error saving item', error: error.message });
    }
};

const getAddItems = async (req, res) => {
    try {
        const items = await AddItem.find().sort({ createdAt: -1 });
        res.json(items);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching items', error: error.message });
    }
};

const getAddItemsByCustomer = async (req, res) => {
    try {
        const items = await AddItem.find({ customerName: req.params.customerName }).sort({ createdAt: -1 });
        res.json(items);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching items', error: error.message });
    }
};

const getAddItemsByInvoice = async (req, res) => {
    try {
        const items = await AddItem.find({ invoiceNo: req.params.invoiceNo }).sort({ createdAt: -1 });
        res.json(items);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching items', error: error.message });
    }
};

const deleteAddItem = async (req, res) => {
    try {
        const deletedItem = await AddItem.findByIdAndDelete(req.params.id);
        if (!deletedItem) return res.status(404).json({ message: 'Item not found' });
        res.json({ message: 'Item deleted successfully', item: deletedItem });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting item', error: error.message });
    }
};

module.exports = {
    createAddItem,
    getAddItems,
    getAddItemsByCustomer,
    getAddItemsByInvoice,
    deleteAddItem,
};
