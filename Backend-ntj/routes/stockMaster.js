const express = require('express');
const router = express.Router();
const { getStocks, createStock, updateStock, deleteStock } = require('../controllers/stockMasterController');

router.get('/', getStocks);
router.post('/', createStock);
router.put('/:id', updateStock);
router.delete('/:id', deleteStock);

module.exports = router;