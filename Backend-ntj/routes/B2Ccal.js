const express = require('express');
const router = express.Router();
const B2Ccal = require('../models/B2Ccal');

// Route to create a new B2C calculation entry
router.post('/', async (req, res) => {
    try {
        const { customerName, Address, Phone, Date, InvoiceNumber } = req.body;
        const newB2Ccal = new B2Ccal({ customerName, Address, Phone, Date, InvoiceNumber });
        const savedEntry = await newB2Ccal.save();
        res.status(201).json(savedEntry);
    } catch (error) {
        res.status(500).json({ message: 'Error saving B2C calculation entry', error });
    }       
});
// Route to get all B2C calculation entries
router.get('/', async (req, res) => {
    try {
        const entries = await B2Ccal.find();    
        res.status(200).json(entries);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching B2C calculation entries', error });
    }   
});

module.exports = router;