const express = require('express');
const router = express.Router();
const ReceiptEntry = require('../models/ReceiptEntry');

router.post('/', async (req, res) => {
    try {
        const { itemName, weight, stone, touch, purity, date } = req.body;
        
        if (!itemName || weight === undefined || stone === undefined || touch === undefined || purity === undefined) {
            return res.status(400).json({ 
                message: 'Missing required fields',
                received: req.body 
            });
        }

        const newReceiptEntry = new ReceiptEntry({
            itemName,
            weight,
            stone,
            touch,
            purity,
        });

        const savedEntry = await newReceiptEntry.save();
        res.status(201).json({
            message: 'ReceiptEntry created successfully',
            receiptEntry: savedEntry
        });
    } catch (error) {
        console.error('Error saving receipt entry:', error);
        res.status(500).json({ 
            message: 'Server error', 
            error: error.message 
        });
    }
});

router.get('/', async (req, res) => {
    try {
        const entries = await ReceiptEntry.find().sort({ createdAt: -1 });
        res.status(200).json(entries);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;