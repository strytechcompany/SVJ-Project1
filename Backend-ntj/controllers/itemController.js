const Item = require('../models/Item');

const createItem = async (req, res) => {
    try {
        const {
            stockName, itemDetails, buyingTouch, sellingTouch, percentage, date, issue, receipt
        } = req.body;

        if (!stockName || !itemDetails || buyingTouch == null || sellingTouch == null || percentage == null || !date) {
            return res.status(400).json({ message: "All required fields must be filled" });
        }

        let type = null;
        if (issue && receipt) type = 'issue';
        else if (issue) type = 'issue';
        else if (receipt) type = 'receipt';

        const newItem = new Item({
            stockName, itemDetails, buyingTouch, sellingTouch, percentage, date,
            issue: issue || false,
            receipt: receipt || false,
            type
        });

        const savedItem = await newItem.save();
        res.status(201).json({ message: 'Item created successfully', item: savedItem });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const getItems = async (req, res) => {
    try {
        const items = await Item.find().sort({ createdAt: -1 });
        res.status(200).json(items);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const updateItem = async (req, res) => {
    try {
        const { issue, receipt } = req.body;
        let type = null;
        if (issue && receipt) type = 'issue';
        else if (issue) type = 'issue';
        else if (receipt) type = 'receipt';

        const updatedItem = await Item.findByIdAndUpdate(
            req.params.id,
            { ...req.body, type },
            { new: true, runValidators: true }
        );

        if (!updatedItem) return res.status(404).json({ message: 'Item not found' });
        res.status(200).json({ message: 'Item updated successfully', item: updatedItem });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const deleteItem = async (req, res) => {
    try {
        const deletedItem = await Item.findByIdAndDelete(req.params.id);
        if (!deletedItem) return res.status(404).json({ message: 'Item not found' });
        res.status(200).json({ message: 'Item deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

module.exports = {
    createItem,
    getItems,
    updateItem,
    deleteItem,
};
