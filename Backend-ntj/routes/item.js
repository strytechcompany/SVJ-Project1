const express = require('express');
const router = express.Router();
const Item = require('../models/Item'); // Make sure the path is correct

// POST /items - create a new item
router.post('/', async (req, res) => {
  try {
    const {
      itemName,
      weight,
      buyingTouch,
      sellingTouch,
      cash,
      cashPercentage,   
      cashWeight
    } = req.body;

    // Create a new Item
    const newItem = new Item({
      itemName,
      weight,
      buyingTouch,
      sellingTouch,
      cash,
      cashPercentage,
      cashWeight
    });

    // Save to database
    const savedItem = await newItem.save();

    res.status(201).json({
      message: 'Item created successfully',
      item: savedItem
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});


// GET /items - get all items
router.get('/', async (req, res) => {
  try {
    const items = await Item.find().sort({ createdAt: -1 }); // Get all items, newest first
    res.status(200).json(items);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /items/:id - get a single item by ID
router.get('/:id', async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }
    res.status(200).json(item);   
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
