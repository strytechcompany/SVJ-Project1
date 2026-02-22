const express = require('express');
const router = express.Router();
const Login = require('../models/Login');

// @desc    Authenticate user
router.post('/', async (req, res) => {
  console.log('=== LOGIN ROUTE HIT ===');
  console.log('Request body:', req.body);

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await Login.findOne({ email: cleanEmail });
    console.log('User found in DB:', user ? 'YES' : 'NO');

    if (!user) {
      return res.status(401).json({ message: 'User not found. Please contact admin.' });
    }

    console.log('Stored hashed password:', user.password);
    console.log('Entered password:', password);

    const isMatch = await user.matchPassword(password.trim());
    console.log('Password match result:', isMatch);

    if (!isMatch) {
      return res.status(401).json({ message: 'Incorrect password.' });
    }

    return res.status(200).json({
      message: 'Login successful',
      user: {
        id: user._id,
        email: user.email,
      },
    });

  } catch (error) {
    console.error('=== LOGIN ERROR ===');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Full error:', error);
    return res.status(500).json({ 
      message: 'Server error', 
      error: error.message,
      errorName: error.name 
    });
  }
});

// @desc    Seed default user
router.post('/seed', async (req, res) => {
  try {
    await Login.deleteMany({}); // Clear existing to avoid conflicts
    
    const user = new Login({
      email: 'AkshayaGold@gmail.com',
      password: '12345678',
    });

    await user.save();
    console.log('Default user seeded successfully');
    res.status(201).json({ message: 'Default user created successfully' });

  } catch (error) {
    console.error('Seed error:', error);
    res.status(500).json({ message: 'Seed error', error: error.message });
  }
});

// @desc    Check if user exists (debug helper)
router.get('/check', async (req, res) => {
  try {
    const users = await Login.find({}, { email: 1, createdAt: 1 });
    res.status(200).json({ count: users.length, users });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
