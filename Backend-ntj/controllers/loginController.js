const Login = require('../models/Login');

// @desc    Authenticate user & get token
// @route   POST /api/login
// @access  Public
const authUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        const cleanEmail = email.toLowerCase().trim();
        const user = await Login.findOne({ email: cleanEmail });

        if (user && (await user.matchPassword(password))) {
            res.json({
                id: user._id,
                email: user.email,
                token: user.generateToken(),
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Seed default user
// @route   POST /api/login/seed
// @access  Public
const seedUser = async (req, res) => {
    try {
        const existing = await Login.findOne({ email: 'AkshayaGold@gmail.com' });
        if (existing) {
            return res.status(400).json({ message: 'Default user already exists' });
        }

        const user = new Login({
            email: 'AkshayaGold@gmail.com',
            password: '12345678',
        });

        await user.save();
        res.status(201).json({ message: 'Default user created successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error seeding user', error: error.message });
    }
};

module.exports = {
    authUser,
    seedUser,
};
