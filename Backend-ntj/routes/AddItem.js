const express = require('express');
const router = express.Router();
const AddItem = require('../models/AddItem');

// Route to create a new item
router.post('/', async (req, res) => {
    try {
        const { 
            customerName, 
            invoiceNo, 
            itemName, 
            weight,  // Original weight entered by user
            touch, 
            wm, 
            rate, 
            total, 
            gst, 
            final, 
            modifiedWeight,  // Remaining stock weight
            stockMasterId,
            date
        } = req.body;

        // Create new item with modifiedWeight stored in the weight field
        const newItem = new AddItem({ 
            customerName,
            invoiceNo: invoiceNo || 'N/A',
            itemName, 
            weight: modifiedWeight,  // ✅ STORE MODIFIED WEIGHT HERE
            touch, 
            wm, 
            rate,
            total,
            gst,
            final,
            modifiedWeight,  // Also keep it in separate field for reference
            stockMasterId,
            date
        });

        const savedItem = await newItem.save();
        
        
        res.status(201).json(savedItem);
    } catch (error) {
        console.error('❌ Error saving item:', error);
        res.status(500).json({ message: 'Error saving item', error: error.message });
    }   
});

// Route to get all items
router.get('/', async (req, res) => {
    try {   
        const items = await AddItem.find().sort({ createdAt: -1 });  // Sort by newest first
        res.status(200).json(items);
    } catch (error) {
        console.error('❌ Error fetching items:', error);
        res.status(500).json({ message: 'Error fetching items', error: error.message });
    }       
});

// Route to get items by customer name
router.get('/customer/:customerName', async (req, res) => {
    try {
        const items = await AddItem.find({ 
            customerName: req.params.customerName 
        }).sort({ createdAt: -1 });
        res.status(200).json(items);
    } catch (error) {
        console.error('❌ Error fetching items by customer:', error);
        res.status(500).json({ message: 'Error fetching items', error: error.message });
    }
});

// Route to get items by invoice number
router.get('/invoice/:invoiceNo', async (req, res) => {
    try {
        const items = await AddItem.find({ 
            invoiceNo: req.params.invoiceNo 
        }).sort({ createdAt: -1 });
        res.status(200).json(items);
    } catch (error) {
        console.error('❌ Error fetching items by invoice:', error);
        res.status(500).json({ message: 'Error fetching items', error: error.message });
    }
});

// Route to delete an item
router.delete('/:id', async (req, res) => {
    try {
        const deletedItem = await AddItem.findByIdAndDelete(req.params.id);
        if (!deletedItem) {
            return res.status(404).json({ message: 'Item not found' });
        }
        res.status(200).json({ message: 'Item deleted successfully', item: deletedItem });
    } catch (error) {
        console.error('❌ Error deleting item:', error);
        res.status(500).json({ message: 'Error deleting item', error: error.message });
    }
});

module.exports = router;