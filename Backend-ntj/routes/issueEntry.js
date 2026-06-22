const express = require('express');
const router = express.Router();
const IssueEntry = require('../models/IssueEntry');
const BillCounter = require('../models/BillCounter');

// Auto-generate bill number like BILL001
async function generateIssueBillNo() {
    const counter = await BillCounter.findOneAndUpdate(
        { key: 'issueEntry' },
        { $inc: { counter: 1 } },
        { new: true, upsert: true }
    );
    return `BILL${String(counter.counter).padStart(3, '0')}`;
}

router.post('/', async (req, res) => {
    try {
        const {
            itemName, weight, purity,
            barcode, itemNumber, count,
            sriCost, sriBill, plus,
            // legacy
            stone, touch, buyingCost, sellingCost,
        } = req.body;

        if (!itemName || weight === undefined || purity === undefined) {
            return res.status(400).json({
                message: 'Missing required fields: itemName, weight, or purity',
                received: req.body
            });
        }

        const billNo = await generateIssueBillNo();

        const newIssueEntry = new IssueEntry({
            billNo,
            barcode:     barcode     || '',
            itemNumber:  itemNumber  || '',
            itemName,
            weight,
            count:       count       !== undefined ? count      : 1,
            sriCost:     sriCost     !== undefined ? sriCost    : 0,
            sriBill:     sriBill     !== undefined ? sriBill    : 0,
            plus:        plus        !== undefined ? plus       : 0,
            purity,
            stone:       stone       !== undefined ? stone      : 0,
            touch:       touch       !== undefined ? touch      : 0,
            buyingCost:  buyingCost  !== undefined ? buyingCost : 0,
            sellingCost: sellingCost !== undefined ? sellingCost: 0,
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