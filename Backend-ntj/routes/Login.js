const express = require('express');
const router = express.Router();
const { authUser, seedUser } = require('../controllers/loginController');

router.post('/', authUser);
router.post('/seed', seedUser);

module.exports = router;
