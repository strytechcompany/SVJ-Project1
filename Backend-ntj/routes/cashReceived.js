
const express = require('express');
const router = express.Router();
const CashReceived = require('../models/cashReceived');

// Route to create a new cash received entry
router.post('/', async (req, res) => {
    try {
        const { rupees, goldrate, pure } = req.body;
        const newCashReceived = new CashReceived({ rupees, goldrate, pure });
        const savedEntry = await newCashReceived.save();
        res.status(201).json(savedEntry);
    } catch (error) {
        res.status(500).json({ message: 'Error saving cash received entry', error });
    }           
});
// Route to get all cash received entries
router.get('/', async (req, res) => {
    try {
        const entries = await CashReceived.find();
        res.status(200).json(entries);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching cash received entries', error });
    }   
});

module.exports = router;