const express = require('express');
const router = express.Router();
const IssueEntry = require('../models/IssueEntry');

router.post('/', async (req, res) => {
    try {
        const { itemName, weight, stone, touch, purity, buyingCost, sellingCost, plus } = req.body;
        
        // Validate required fields (itemName, weight, purity are always required)
        if (!itemName || weight === undefined || purity === undefined) {
            return res.status(400).json({ 
                message: 'Missing required fields: itemName, weight, or purity',
                received: req.body 
            });
        }

        const newIssueEntry = new IssueEntry({
            itemName,
            weight,
            stone: stone !== undefined ? stone : 0,
            touch: touch !== undefined ? touch : 0,
            purity,
            buyingCost,
            sellingCost,
            plus
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