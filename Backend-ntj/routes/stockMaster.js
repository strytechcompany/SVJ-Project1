const express = require('express');
const router = express.Router();
const StockMaster = require('../models/StockMaster');

// GET: Fetch all StockMaster entries
router.get('/', async (req, res) => {
    try {
        const stocks = await StockMaster.find().sort({ createdAt: -1 });
        res.json(stocks);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST: Create a new StockMaster entry
router.post('/', async (req, res) => {
    try {
        const stockData = new StockMaster({
            itemName: req.body.itemName,
            weight: req.body.weight,
            less: req.body.less,
            netWeight: req.body.netWeight,
            calculation: req.body.calculation,
            pure: req.body.pure,
            workerName: req.body.workerName || "",
            description: req.body.description || ""
        });

        const savedStock = await stockData.save();
        res.status(201).json(savedStock);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// PUT: Update a StockMaster entry
router.put('/:id', async (req, res) => {
    try {
        const updatedStock = await StockMaster.findByIdAndUpdate(
            req.params.id,
            {
                itemName: req.body.itemName,
                weight: req.body.weight,
                less: req.body.less,
                netWeight: req.body.netWeight,
                calculation: req.body.calculation,
                pure: req.body.pure,
                workerName: req.body.workerName || "",
                description: req.body.description || ""
            },
            { new: true, runValidators: true }
        );
        
        if (!updatedStock) {
            return res.status(404).json({ message: 'Stock not found' });
        }
        
        res.json(updatedStock);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// DELETE: Delete a StockMaster entry
router.delete('/:id', async (req, res) => {
    try {
        const deletedStock = await StockMaster.findByIdAndDelete(req.params.id);
        
        if (!deletedStock) {
            return res.status(404).json({ message: 'Stock not found' });
        }
        
        res.json({ message: 'Stock deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;