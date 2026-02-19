const express = require('express');
const router = express.Router();
const Item = require('../models/Item');

// CREATE NEW ITEM
router.post('/', async (req, res) => {
  try {
    const { 
      stockName, 
      itemDetails, 
      buyingTouch, 
      sellingTouch, 
      percentage, 
      date,
      issue,
      receipt 
    } = req.body;

    if (!stockName || !itemDetails || buyingTouch == null || sellingTouch == null || percentage == null || !date) {
      return res.status(400).json({ message: "All required fields must be filled" });
    }

    // Determine type based on checkboxes
    let type = null;
    if (issue && receipt) {
      // If both are checked, you can decide the priority or handle differently
      type = 'issue'; // Default to issue if both checked
    } else if (issue) {
      type = 'issue';
    } else if (receipt) {
      type = 'receipt';
    }

    const newItem = new Item({ 
      stockName, 
      itemDetails, 
      buyingTouch, 
      sellingTouch, 
      percentage, 
      date,
      type
    });
    
    const savedItem = await newItem.save();

    res.status(201).json({ message: 'Item created successfully', item: savedItem });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET ALL ITEMS
router.get('/', async (req, res) => {
  try {
    const items = await Item.find().sort({ createdAt: -1 });
    res.status(200).json(items);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET ITEM BY ID
router.get('/:id', async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Item not found' });
    res.status(200).json(item);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// UPDATE ITEM BY ID
router.put('/:id', async (req, res) => {
  try {
    const {
      stockName,
      itemDetails,
      buyingTouch,
      sellingTouch,
      percentage,
      date,
      issue,
      receipt
    } = req.body;

    // Determine type based on checkboxes
    let type = null;
    if (issue && receipt) {
      type = 'issue'; // Default to issue if both checked
    } else if (issue) {
      type = 'issue';
    } else if (receipt) {
      type = 'receipt';
    }

    const updatedItem = await Item.findByIdAndUpdate(
      req.params.id,
      {
        stockName,
        itemDetails,
        buyingTouch,
        sellingTouch,
        percentage,
        date,
        issue: issue || false,
        receipt: receipt || false,
        type
      },
      { new: true, runValidators: true }
    );

    if (!updatedItem) return res.status(404).json({ message: 'Item not found' });

    res.status(200).json({ message: 'Item updated successfully', item: updatedItem });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// DELETE ITEM BY ID
router.delete('/:id', async (req, res) => {
  try {
    const deletedItem = await Item.findByIdAndDelete(req.params.id);
    if (!deletedItem) return res.status(404).json({ message: 'Item not found' });

    res.status(200).json({ message: 'Item deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;