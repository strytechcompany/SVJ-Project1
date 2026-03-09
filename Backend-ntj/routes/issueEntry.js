const express = require('express');
const router = express.Router();
const IssueEntry = require('../models/IssueEntry');

router.post('/', async (req, res) => {
    try {
        const { itemName, weight, stone, touch, purity } = req.body;
        
        // Validate required fields
        if (!itemName || weight === undefined || stone === undefined || touch === undefined || purity === undefined) {
            return res.status(400).json({ 
                message: 'Missing required fields',
                received: req.body 
            });
        }

        const newIssueEntry = new IssueEntry({
            itemName,
            weight,
            stone,
            touch,
            purity,
        });

        const savedEntry = await newIssueEntry.save();
        res.status(201).json({
            message: 'IssueEntry created successfully',
            issueEntry: savedEntry
        });
    } catch (error) {
        console.error('Error saving issue entry:', error);
        res.status(500).json({ 
            message: 'Server error', 
            error: error.message,
            details: error 
        });
    }
});

router.get('/', async (req, res) => {
    try {
        const entries = await IssueEntry.find().sort({ createdAt: -1 });
        res.status(200).json(entries);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;