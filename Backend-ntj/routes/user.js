const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Login = require('../models/Login');

// Create user — also creates a Login record so the user can log in
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, role, password } = req.body;

    if (!password) {
      return res.status(400).json({ message: 'Password is required to create a user with login access' });
    }

    // Check if a Login record already exists for this email
    const existingLogin = await Login.findOne({ email: email.toLowerCase().trim() });
    if (existingLogin) {
      return res.status(400).json({ message: 'A login with this email already exists' });
    }

    // 1. Save user profile (name, email, phone, role)
    const newUser = new User({ name, email, phone, role });
    const savedUser = await newUser.save();

    // 2. Create Login record — password is hashed automatically by the Login model's pre-save hook
    const newLogin = new Login({ email: email.toLowerCase().trim(), password });
    await newLogin.save();

    res.status(201).json(savedUser);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error creating user', error: err.message });
  }
});

// Update user
router.put('/:id', async (req, res) => {
  try {
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(updatedUser);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error updating user' });
  }
});

// Get all users
router.get('/', async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching users' });
  }
});

// Delete user — also removes the Login record
router.delete('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Remove associated Login record
    await Login.findOneAndDelete({ email: user.email.toLowerCase().trim() });

    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User and login access removed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error deleting user' });
  }
});

module.exports = router;
