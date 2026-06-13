const User = require('../models/User');
const Login = require('../models/Login');

// @desc    Get all users
// @route   GET /api/users
// @access  Private (should be protected in routes)
const getUsers = async (req, res) => {
    try {
        const users = await User.find({});
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching users', error: error.message });
    }
};

// @desc    Create new user
// @route   POST /api/users
// @access  Private (should be protected in routes)
const createUser = async (req, res) => {
    try {
        const newUser = new User(req.body);
        const savedUser = await newUser.save();

        // Sync with Login collection
        if (req.body.email && req.body.password) {
            const loginExists = await Login.findOne({ email: req.body.email.toLowerCase().trim() });
            if (!loginExists) {
                const newLogin = new Login({
                    email: req.body.email,
                    password: req.body.password
                });
                await newLogin.save();
            }
        }

        res.status(201).json(savedUser);
    } catch (error) {
        res.status(500).json({ message: 'Error creating user', error: error.message });
    }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private
const updateUser = async (req, res) => {
    try {
        const oldUser = await User.findById(req.params.id);
        const updatedUser = await User.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );
        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Sync with Login collection
        if (req.body.email || req.body.password) {
            const loginRecord = await Login.findOne({ email: oldUser.email.toLowerCase().trim() });
            if (loginRecord) {
                if (req.body.email) loginRecord.email = req.body.email;
                if (req.body.password) loginRecord.password = req.body.password;
                await loginRecord.save();
            } else if (req.body.email && req.body.password) {
                // Create if didn't exist
                const newLogin = new Login({
                    email: req.body.email,
                    password: req.body.password
                });
                await newLogin.save();
            }
        }

        res.json(updatedUser);
    } catch (error) {
        res.status(500).json({ message: 'Error updating user', error: error.message });
    }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private
const deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Remove from Login collection too
        await Login.findOneAndDelete({ email: user.email.toLowerCase().trim() });

        await User.findByIdAndDelete(req.params.id);
        res.json({ message: 'User removed' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting user', error: error.message });
    }
};

module.exports = {
    getUsers,
    createUser,
    updateUser,
    deleteUser,
};
