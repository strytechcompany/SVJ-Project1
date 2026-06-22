const express = require('express');
const router = express.Router();
const ReceiptEntry = require('../models/ReceiptEntry');

router.post('/', async (req, res) => {
    try {
        const {
            billNo, receiptType, itemName,
            weight, less, actualTouch, takenTouch, purity,
            goldRate, amount,
            // legacy
            stone, touch,
        } = req.body;

        if (weight === undefined || purity === undefined) {
            return res.status(400).json({
                message: 'Missing required fields: weight or purity',
                received: req.body
            });
        }

        const newReceiptEntry = new ReceiptEntry({
            billNo:      billNo      || '',
            receiptType: receiptType || '',
            itemName:    itemName    || '',
            weight,
            less:        less        !== undefined ? less        : 0,
            actualTouch: actualTouch !== undefined ? actualTouch : 0,
            takenTouch:  takenTouch  !== undefined ? takenTouch  : 0,
            purity,
            goldRate:    goldRate    !== undefined ? goldRate    : 0,
            amount:      amount      !== undefined ? amount      : 0,
            stone:       stone       !== undefined ? stone       : 0,
            touch:       touch       !== undefined ? touch       : 0,
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