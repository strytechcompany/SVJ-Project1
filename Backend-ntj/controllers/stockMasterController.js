const StockMaster = require('../models/StockMaster');

const getStocks = async (req, res) => {
    try {
        const stocks = await StockMaster.find().sort({ createdAt: -1 });
        res.json(stocks);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const createStock = async (req, res) => {
    try {
        const stockData = new StockMaster(req.body);
        const savedStock = await stockData.save();
        res.status(201).json(savedStock);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

const updateStock = async (req, res) => {
    try {
        const { barcode, ...updateData } = req.body;
        const updatedStock = await StockMaster.findByIdAndUpdate(
            req.params.id, updateData, { new: true, runValidators: true }
        );
        if (!updatedStock) return res.status(404).json({ message: 'Stock not found' });
        res.json(updatedStock);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

const deleteStock = async (req, res) => {
    try {
        const deletedStock = await StockMaster.findByIdAndDelete(req.params.id);
        if (!deletedStock) return res.status(404).json({ message: 'Stock not found' });
        res.json({ message: 'Stock deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const getStockByBarcode = async (req, res) => {
    try {
        const stock = await StockMaster.findOne({ barcode: req.params.barcode });
        if (!stock) return res.status(404).json({ message: 'No item found with this barcode' });
        res.json(stock);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

module.exports = {
    getStocks,
    createStock,
    updateStock,
    deleteStock,
    getStockByBarcode,
};
